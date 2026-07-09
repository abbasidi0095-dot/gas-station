# Spec: Conversational AI Assistant Final Confirmation Step

## 1. Objective
Enable a final validation/double-check screen step for Saisie Rapide (IA). Before any transaction is automatically committed to the database, the assistant must display a confirmation dialog prompt in French and offer clickable pills:
*   `"Enregistrer l'opération"` (Validate and Save)
*   `"Ajouter des détails"` (Provide more details)

## 2. Confirmation State Flow
1.  **Completeness Audit:** Gemini evaluates if all required fields are filled.
2.  **Intercept Finalization:** If everything is collected but the user has not confirmed yet, Gemini holds the status as `"incomplete"` and sets:
    *   `prompt`: "Toutes les informations sur l'opération sont prêtes. Voulez-vous l'enregistrer maintenant ou ajouter des détails ?"
    *   `options`: `["Enregistrer l'opération", "Ajouter des détails"]`
3.  **Validate/Commit Step:**
    *   If the user selects `"Enregistrer l'opération"` or replies with confirmation text (e.g. "oui", "valider", "enregistrer"), Gemini sets `"status": "complete"`.
    *   If the user selects `"Ajouter des détails"`, Gemini prompts: "Quels détails souhaitez-vous ajouter ?" and waits for input.

## 3. Redesigned Gemini Prompt Rules
The prompt in `backend/src/services/gemini.js` is adjusted to strictly manage this confirmation state based on previous conversational prompts.
