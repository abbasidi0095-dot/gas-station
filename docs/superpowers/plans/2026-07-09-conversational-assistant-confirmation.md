# Conversational AI Assistant Final Confirmation Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a natural validation step before saving transactions, asking the user "Voulez-vous l'enregistrer maintenant ?" with options to save or add details.

**Architecture:** Update the Gemini instruction prompt in `/home/ubuntu/gas/backend/src/services/gemini.js` to manage a confirmation state when all required fields are collected, offering buttons to confirm or add details, and only returning `"status": "complete"` upon explicit confirmation.

**Tech Stack:** Node.js, Express, Gemini API.

---

### Task 1: Redesign Gemini Rules for Final Confirmation Step

**Files:**
- Modify: `/home/ubuntu/gas/backend/src/services/gemini.js:219-328`

**Interfaces:**
- Consumes: `inputText` (string), `context` (object | null)
- Produces: `classifyTextWithGemini` function returning status, prompt, options, and transaction payload.

- [ ] **Step 1: Read gemini.js to verify current prompt text.**
- [ ] **Step 2: Update the prompt rules inside classifyTextWithGemini.**
Change the determination of "status", "prompt", and "options" to intercept completion, ask for confirmation first, and only set status to complete when confirmed.

```javascript
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
- If "type" and "amount" are known, but some recommended fields ("vendor", "date", or "fuelType" for "fuel_purchase") are missing or "unknown", check if we have already asked for them.
  - If we have NOT asked for a recommended field yet, set "status" to "incomplete" and prompt the user for it.
    - If asking for "fuelType": ["Gasoil", "Essence", "Passer / Ignorer"]
    - If asking for "category" of charge: ["Achat Carburant", "Eau et électricité", "Produits de nettoyage", "Loyer", "Maintenance", "Autre"]
    - If asking for "category" of revenue: ["Ventes de carburant", "Ventes boutique", "Services", "Autre"]
    - If asking for "vendor": ["Afriquia", "Al Mohit", "Passer / Ignorer"]
    - If asking for "date": ["Aujourd'hui", "Hier", "Passer / Ignorer"]
- If all required and recommended fields are collected OR any remaining recommended fields have already been prompted/skipped, we enter the final Confirmation Step:
  - Check the Previous Assistant Prompt ("${context ? context.previousPrompt : ''}").
  - If the previous prompt was NOT yet the final confirmation prompt (i.e., we just finished collecting the fields), do NOT set "status" to "complete". Instead, set "status" to "incomplete" and:
    - Set "prompt" to: "Toutes les informations sur l'opération sont prêtes. Souhaitez-vous enregistrer l'opération ou ajouter d'autres détails ?"
    - Set "options" to: ["Enregistrer l'opération", "Ajouter des détails"]
  - If the previous prompt WAS already the final confirmation prompt:
    - If the user's response is to confirm (e.g., clicks "Enregistrer l'opération" or says "enregistrer", "valider", "oui", "ok"), set "status" to "complete" and "prompt" to null.
    - If the user wants to add details (e.g., clicks "Ajouter des détails" or says "ajouter", "modifier", "non"), set "status" to "incomplete", set "prompt" to "Quels détails souhaitez-vous ajouter ou modifier ?", and set "options" to ["Passer / Ignorer"].
    - If the user responds with something else, update the fields and present the confirmation prompt again.

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
```

- [ ] **Step 3: Verify backend syntax is perfect.**
Run: `node --check backend/src/services/gemini.js`

- [ ] **Step 4: Restart backend service and test daily backup.**
Run: `sudo systemctl restart almohit.service`
Run: `/home/ubuntu/gas/scripts/daily-backup.sh`

- [ ] **Step 5: Stage and commit the backend codebase changes and push to GitHub.**
Run: `git add backend/src/services/gemini.js && git commit -m "feat(ai): add double-check confirmation step to AI quick-add"`
Run: `git push origin master`
