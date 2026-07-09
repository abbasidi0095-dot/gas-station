# Spec: Conversational AI Assistant Soft-Prompting Improvements

## 1. Objective
Enhance the "Saisie Rapide IA" conversational assistant to proactively collect recommended but non-strictly required details of financial transactions (such as vendor, date, category details, or fuel type) through a friendly, natural dialogue before logging the transaction. 

## 2. Conversation Flow Design
Instead of a single-turn parsing, the assistant will engage in a multi-turn conversation if recommended information is missing.

### 2.1 Strictly Required Fields (Cannot complete without these)
*   **type**: Must be classified as `charge` (expense), `revenue` (income), or `salary`.
*   **amount**: Must be extracted as a valid number.
*   **workerName**: (Required only if type is `salary`) must match an active worker.

### 2.2 Recommended Fields (Prompt once if missing)
*   **category**: 
    *   For charges: `fuel_purchase`, `water_electricity`, `cleaning_products`, `rent`, `maintenance`, `other`.
    *   For revenues: `fuel_sales`, `store_sales`, `services`, `other`.
*   **vendor**: Name of supplier/vendor (only for charges).
*   **fuelType**: Only if category is `fuel_purchase`. Must be `gasoil` or `essence`.
*   **date**: Transaction date in YYYY-MM-DD. Defaults to today's date if skipped.

### 2.3 Skip & Fallback Logic
*   **Soft Prompting:** If a recommended field is missing, Gemini will ask for it. It will track which fields have already been prompted inside `context` so it never asks the same question twice.
*   **Smart Fallbacks:** If the user replies by skipping, saying "je ne sais pas", "skip", "aucun", "none", "pas de fournisseur", or ignores the question to talk about something else, the assistant immediately sets `status` to `"complete"` and applies fallback defaults (e.g. category `other`, vendor `unknown`, or current date).

## 3. Gemini Prompt System
The classification prompt in `gemini.js` is redesigned to receive the conversation context:
```json
{
  "originalInput": "original text",
  "previousPrompt": "previous prompt asked",
  "partialTransaction": { ... }
}
```
Gemini is instructed to output the following JSON structure:
```json
{
  "status": "complete" | "incomplete",
  "prompt": "friendly query in French or null",
  "transaction": {
    "type": "charge" | "revenue" | "salary" | null,
    "category": "string" | null,
    "amount": number | null,
    "vendor": "string" | null,
    "workerName": "string" | null,
    "date": "YYYY-MM-DD",
    "description": "string" | null,
    "fuelType": "gasoil" | "essence" | "unknown" | null
  }
}
```
