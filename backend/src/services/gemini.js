const API_KEYS = (process.env.GEMINI_API_KEYS || '').split(',').filter(Boolean);
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

const COOLDOWN_MS = 60_000;
const RATE_LIMIT_CODES = [429, 403];

let keyCooldowns = {};

function getWorkingKey() {
  const now = Date.now();
  for (const key of API_KEYS) {
    const cooldownUntil = keyCooldowns[key];
    if (!cooldownUntil || now >= cooldownUntil) {
      return key;
    }
  }
  const earliest = Math.min(...API_KEYS.map(k => keyCooldowns[k] || 0));
  return null;
}

function coolDown(key) {
  keyCooldowns[key] = Date.now() + COOLDOWN_MS;
}

function fileToInlinePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

function extractFieldsFromRaw(text) {
  const r = {};
  const m = s => { const x = s.exec(text); return x ? x[1].trim() : undefined; };
  const mNum = s => { const x = s.exec(text); return x ? parseFloat(x[1]) : undefined; };
  r.vendor = m(/"vendor"\s*:\s*"([^"]*)"/i) || 'unknown';
  r.amount = mNum(/"amount"\s*:\s*([0-9]+\.?[0-9]*)/i) !== undefined ? mNum(/"amount"\s*:\s*([0-9]+\.?[0-9]*)/i) : null;
  r.currency = m(/"currency"\s*:\s*"([^"]*)"/i) || 'MAD / DH';
  r.fuelType = m(/"fuelType"\s*:\s*"([^"]*)"/i) || 'unknown';
  r.date = m(/"date"\s*:\s*"([^"]*)"/i) || new Date().toISOString().split('T')[0];
  r.confidence = mNum(/"confidence"\s*:\s*([0-9]+\.?[0-9]*)/i) !== undefined ? mNum(/"confidence"\s*:\s*([0-9]+\.?[0-9]*)/i) : 0.5;
  r.extractedRawText = m(/"extractedRawText"\s*:\s*"((?:[^"\\]|\\.)*)"/s) || '';
  return [r];
}

function validateDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return dateStr;
}

async function generateWithKey(key, requestBody) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    const status = response.status;
    if (RATE_LIMIT_CODES.includes(status)) {
      coolDown(key);
    }
    const err = new Error(`Gemini API request failed (${status}): ${errText}`);
    err.status = status;
    return err;
  }

  return response;
}

export async function scanReceiptWithGemini(fileBuffer, mimeType) {
  const prompt = `You are an expert OCR engine reading fuel station receipts from Morocco.
A single photo may contain ONE or MULTIPLE receipts (e.g. a pile of receipts photographed together).

**Strategy — count first, then extract:**
1. First scan the whole image and count how many separate, distinct receipts are present.
   Look for different borders, logos, layouts, or paper edges.
2. Only after counting, extract the fields for each receipt one by one.

Extract EVERY receipt you counted. Do not skip any.

For EACH receipt, extract the following fields:

1. "vendor": The supplier name. Look carefully at logos, headers, and letterhead.
   - "Al Mohit" (may appear as Al Mohit / Al-Mohit / Almohit / المحيط)
   - "Afriquia" (may appear as Afriquia / Afriqia / أفريقيا)
   - If neither is recognizable, return "unknown".
2. "amount": The final TOTAL amount to pay as a decimal number (e.g. 1234.56). Pick the grand total, not a subtotal.
3. "currency": Usually "MAD" or "DH". Default to "MAD / DH" if unclear.
4. "fuelType": The fuel type dispensed — look for keywords like "Gasoil", "Diesel", "Gazole", "Essence", "Gasoline", "Sans Plomb", "Super". Return "gasoil" for gasoil/diesel/gazole, "essence" for essence/gasoline/sans plomb/super. If unclear return "unknown".
5. "date": The receipt date in YYYY-MM-DD format. CRITICAL: You MUST find the actual printed date on the receipt. Look for date stamps, headers. If the date uses DD/MM/YYYY, convert to YYYY-MM-DD. DO NOT use today's date.
6. "confidence": A float from 0.0 to 1.0 indicating how confident you are in the extraction (image quality, readability).
7. "extractedRawText": A clean full transcript of all readable text on that specific receipt.

Return ONLY raw JSON — a JSON ARRAY (no markdown fences, no explanation):
[{"vendor":"Al Mohit"|"Afriquia"|"unknown","amount":number,"currency":"MAD / DH","fuelType":"gasoil"|"essence"|"unknown","date":"YYYY-MM-DD","confidence":number,"extractedRawText":"transcript"},...]

If there is only ONE receipt, still return it as a single-element array: [{"vendor":...}].`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          fileToInlinePart(fileBuffer, mimeType),
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  };

  let lastError;

  for (let attempt = 0; attempt < API_KEYS.length * 2; attempt++) {
    const key = getWorkingKey();
    if (!key) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const result = await generateWithKey(key, requestBody);

    if (result instanceof Error) {
      lastError = result;
      if (result.status && !RATE_LIMIT_CODES.includes(result.status)) {
        throw result;
      }
      continue;
    }

    const data = await result.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!resultText) {
      throw new Error('Gemini API returned empty response.');
    }

    console.log('Gemini raw output:', resultText);

    let jsonString = resultText;
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    }

    // Try JSON parse; if fails, use regex fallback
    let items;
    try {
      const parsed = JSON.parse(jsonString);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      items = extractFieldsFromRaw(jsonString);
    }

    return items.map(item => {
      const rawDate = item.date ? String(item.date).trim() : null;
      const parsedDate = validateDate(rawDate);
      if (!parsedDate) {
        console.warn('Gemini: no valid date extracted from receipt, using null instead of fallback');
      }
      return {
        vendor: item.vendor || 'unknown',
        amount: item.amount !== undefined && item.amount !== null ? parseFloat(item.amount) : null,
        currency: item.currency || 'MAD',
        fuelType: item.fuelType || 'unknown',
        date: parsedDate,
        confidence: item.confidence !== undefined ? parseFloat(item.confidence) : 0.5,
        extractedRawText: item.extractedRawText || resultText,
      };
    });
  }

  throw lastError || new Error('All Gemini API keys exhausted or cooling down. Try again later.');
}

export async function manualReceiptEntry({ vendorId, amount, date, category, description, imageUrl, scannedBy, prisma }) {
  const receipt = await prisma.receipt.create({
    data: {
      imageUrl: imageUrl || '/uploads/manual-entry.png',
      vendorId: vendorId || null,
      amount: parseFloat(amount),
      currency: 'MAD',
      extractedRawText: description || 'Manual entry',
      confidenceScore: 1.0,
      status: 'confirmed',
      purpose: 'expense',
      scannedBy,
    },
    include: { vendor: true },
  });

  await prisma.charge.create({
    data: {
      vendorId: vendorId || null,
      receiptId: receipt.id,
      amount: parseFloat(amount),
      category: category || 'fuel_purchase',
      date: new Date(date),
      description: description || 'Manual receipt entry',
      createdBy: scannedBy,
    },
  });

  return receipt;
}
