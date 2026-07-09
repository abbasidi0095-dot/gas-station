import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const LOCATION = process.env.VERTEX_LOCATION || 'global';
const MODEL_ID = 'gemini-2.5-flash';

const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;

let cachedAuth = null;
async function getAuthClient() {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
  }
  return cachedAuth;
}

function fileToInlinePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

export async function scanReceiptWithGemini(fileBuffer, mimeType) {
  const auth = await getAuthClient();
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const accessToken = tokenRes.token;

  if (!accessToken) {
    throw new Error('Failed to obtain Vertex AI access token. Check GOOGLE_APPLICATION_CREDENTIALS.');
  }

  const prompt = `You are an expert OCR engine reading a fuel station receipt from Morocco.
Extract the following fields with high precision:

1. "vendor": The supplier name. Look carefully at logos, headers, and letterhead.
   - "Al Mohit" (may appear as Al Mohit / Al-Mohit / Almohit / المحيط)
   - "Afriquia" (may appear as Afriquia / Afriqia / أفريقيا)
   - If neither is recognizable, return "unknown".
2. "amount": The final TOTAL amount to pay as a decimal number (e.g. 1234.56). Pick the grand total, not a subtotal.
3. "currency": Usually "MAD" or "DH". Default to "MAD" if unclear.
4. "date": The receipt date in YYYY-MM-DD format. If the date uses DD/MM/YYYY, convert it. If no date, use today.
5. "confidence": A float from 0.0 to 1.0 indicating how confident you are in the extraction (image quality, readability).
6. "extractedRawText": A clean full transcript of all readable text on the receipt.

Return ONLY raw JSON (no markdown fences, no explanation):
{"vendor":"Al Mohit"|"Afriquia"|"unknown","amount":number,"currency":"MAD","date":"YYYY-MM-DD","confidence":number,"extractedRawText":"transcript"}`;

  const imagePart = fileToInlinePart(fileBuffer, mimeType);

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          imagePart,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Vertex AI error:', response.status, errText);
    throw new Error(`Vertex AI request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  if (!resultText) {
    throw new Error('Vertex AI returned empty response.');
  }

  console.log('Vertex AI raw output:', resultText);

  let jsonString = resultText;
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(jsonString);

  return {
    vendor: parsed.vendor || 'unknown',
    amount: parsed.amount !== undefined && parsed.amount !== null ? parseFloat(parsed.amount) : null,
    currency: parsed.currency || 'MAD',
    date: parsed.date || new Date().toISOString().split('T')[0],
    confidence: parsed.confidence !== undefined ? parseFloat(parsed.confidence) : 0.5,
    extractedRawText: parsed.extractedRawText || resultText,
  };
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
