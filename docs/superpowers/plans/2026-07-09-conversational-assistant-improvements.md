# Conversational AI Assistant Soft-Prompting Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the AI Saisie Rapide conversational assistant to collect optional/recommended fields (vendor, date, fuelType, category details) via a natural French dialogue using soft-prompting, smart skip fallback, and conversational history tracking.

**Architecture:** Update `classifyTextWithGemini` in `backend/src/services/gemini.js` to parse current input in combination with previous context, evaluate complete vs. incomplete status based on both required and recommended fields, avoid duplicate prompts, and output the required backend API response structure.

**Tech Stack:** Node.js, Express, Gemini API.

---

### Task 1: Refactor Gemini Service for Conversational Soft-Prompting

**Files:**
- Modify: `/home/ubuntu/gas/backend/src/services/gemini.js:219-298`

**Interfaces:**
- Consumes: `inputText` (string), `context` (object | null)
- Produces: `classifyTextWithGemini` function returning `{ status: 'complete'|'incomplete', prompt: string|null, transaction: { type, category, amount, vendor, workerName, date, description, fuelType } }`

- [ ] **Step 1: Read gemini.js implementation around line 219.**
- [ ] **Step 2: Edit gemini.js to update the classifyTextWithGemini function.**
Replace the prompt and body to support soft-prompting conversational flows. Include check for previously asked questions inside context history to avoid double prompting, and set status to "complete" if user skips or provides all details.

```javascript
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

**Determination of Status and Next Question:**
- "type" and "amount" are Strictly Required. If either is missing, set "status" to "incomplete" and set "prompt" to a friendly question in French asking for them.
- If "type" and "amount" are known, but some recommended fields ("vendor", "date", or "fuelType" for "fuel_purchase") are missing or "unknown", evaluate if we should ask for them.
  - CRITICAL: Never ask the same question twice! Check the Previous Assistant Prompt ("${context ? context.previousPrompt : ''}"). If you already asked about a field (like asking for vendor name or fuel type) and it is still missing/unknown in the user's latest response, do NOT ask again. Mark the status as "complete" instead.
  - If a recommended field is missing and has NOT been asked yet, set "status" to "incomplete" and set "prompt" to a friendly question in French asking for that specific detail (e.g., "Quel est le fournisseur (vendor) ?" or "S'agit-il de gasoil ou d'essence ?").
  - If everything is complete, set "status" to "complete" and "prompt" to null.

Return ONLY raw JSON, with no markdown code blocks, no formatting, and no explanation.
JSON Schema to return:
{
  "status": "complete" | "incomplete",
  "prompt": "friendly query in French if status is incomplete, else null",
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
        parts: [{ text: prompt }],
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
```

- [ ] **Step 3: Run Node check-syntax command to verify no syntax errors.**

Run: `node --check backend/src/services/gemini.js`
Expected: exit 0, no output.

- [ ] **Step 4: Restart the Al Mohit backend service to apply changes.**

Run: `sudo systemctl restart almohit.service`
Expected: active and running.

- [ ] **Step 5: Commit changes to git repository.**

```bash
git add backend/src/services/gemini.js
git commit -m "feat(gemini): support soft-prompting for recommended fields"
```
