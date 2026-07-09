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

export async function classifyTextWithGemini(inputText, context = null) {
  let contextPrompt = '';
  if (context) {
    contextPrompt = `
We are in a multi-turn conversation.
- Original User Input: "${context.originalInput || ''}"
- Previous Assistant Prompt: "${context.previousPrompt || ''}"
- Partially Parsed Transaction so far: ${JSON.stringify(context.partialTransaction || {})}

The user has now replied: "${inputText}"

Evaluate if this response answers the previous prompt or requests a skip (e.g., says "none", "pas de fournisseur", "unknown", "skip", "je ne sais pas", "aucun").
If the user indicates they don't know or want to skip/omit a recommended detail, or if they provide different next-step transaction details, immediately set "status" to "complete" and populate missing fields with sensible fallbacks (e.g. category "other", vendor "unknown", date of today).
Otherwise, merge this response with the previous partial transaction fields.`;
  }

  const prompt = `You are a smart financial transaction parsing engine for a Moroccan Gas Station (Al Mohit Station).
Analyze the natural language input and extract or refine the transaction fields.

Input: "${inputText}"
${contextPrompt}

Extract or refine these fields:
1. "type": "charge" (expense/charges), "revenue" (income/revenues), or "salary" (worker salary payment).
2. "category": 
   - If type is "charge": must be one of: "fuel_purchase", "water_electricity", "cleaning_products", "rent", "maintenance", "other"
   - If type is "revenue": must be one of: "fuel_sales", "store_sales", "services", "other"
   - If type is "salary": must be "salary"
3. "amount": The numerical value (float/integer) of the transaction. Look for numbers followed by DH, MAD, Dirham, etc.
4. "vendor": Supplier/Vendor name if applicable (e.g. "Afriquia", "Al Mohit", or a generic name), else "unknown".
5. "workerName": If type is "salary", extract the first name of the employee (e.g. "Hassan", "Ali") if present.
6. "date": The date of the transaction in YYYY-MM-DD format. Default to today's date ("${new Date().toISOString().split('T')[0]}") if not specified or inferred.
7. "description": A clean description in French summarizing the transaction (e.g. "Achat carburant Afriquia", "Salaire de Hassan").
8. "fuelType": (Specifically if category is "fuel_purchase") must be "gasoil" or "essence". If category is not "fuel_purchase", set to null.

**Determination of Status, Next Question and Options:**
- "type" and "amount" are Strictly Required. If either is missing, set "status" to "incomplete" and set "prompt" to a friendly question in French asking for them.
  - If "type" is missing, provide logical options: ["Dépense (Charge)", "Revenu (Recette)", "Salaire"]
  - If "amount" is missing, provide logical options: ["Passer / Ignorer"]
- If "type" and "amount" are known, but some recommended fields ("vendor", "date", or "fuelType" for "fuel_purchase") are missing or "unknown", evaluate if we should ask for them.
  - CRITICAL: Never ask the same question twice! Check the Previous Assistant Prompt ("${context ? context.previousPrompt : ''}"). If you already asked about a field (like asking for vendor name or fuel type) and it is still missing/unknown in the user's latest response, do NOT ask again. Mark the status as "complete" instead.
  - If a recommended field is missing and has NOT been asked yet, set "status" to "incomplete" and set "prompt" to a friendly question in French asking for that specific detail.
    - If asking for "fuelType": provide options: ["Gasoil", "Essence", "Passer / Ignorer"]
    - If asking for "category" of charge: provide options: ["Achat Carburant", "Eau et électricité", "Produits de nettoyage", "Loyer", "Maintenance", "Autre"]
    - If asking for "category" of revenue: provide options: ["Ventes de carburant", "Ventes boutique", "Services", "Autre"]
    - If asking for "vendor": provide options: ["Afriquia", "Al Mohit", "Passer / Ignorer"]
    - If asking for "date": provide options: ["Aujourd'hui", "Hier", "Passer / Ignorer"]
  - If everything is complete, set "status" to "complete" and "prompt" to null.
  
- Whenever "status" is "incomplete", populate the "options" field with an array of 2-5 short text button strings that represent logical choices/answers the user can click instead of typing. Include a "Passer / Ignorer" option where appropriate to make skipping easy. If "status" is "complete", set "options" to null.

Return ONLY raw JSON, with no markdown code blocks, no formatting, and no explanation.
JSON Schema to return:
{
  "status": "complete" | "incomplete",
  "prompt": "friendly query in French if status is incomplete, else null",
  "options": ["Option 1", "Option 2", ...] | null,
  "transaction": {
    "type": "charge" | "revenue" | "salary" | null,
    "category": "string" | null,
    "amount": number | null,
    "vendor": "string" | null,
    "workerName": "string" | null,
    "date": "YYYY-MM-DD",
    "description": "string" | null,
    "fuelType": "gasoil" | "essence" | null
  }
}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
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

    console.log('Gemini conversational classification output:', resultText);

    let jsonString = resultText;
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(jsonString);
    } catch {
      throw new Error('Failed to parse Gemini classification response as JSON.');
    }
  }

  throw lastError || new Error('All Gemini API keys exhausted or rate-limited.');
}
