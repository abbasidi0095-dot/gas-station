# Spec: Global Quick Add Assistant and Button Standardization

## 1. Objective
Enable Salami (the admin) to input financial transactions in natural language (e.g., "charge of salary", "gasoil 200mad", "salaire hassan 2500 DH") from any screen in the system using a globally accessible Floating Action Button (FAB).
Standardize all buttons and button texts across the frontend codebase to eliminate mismatched padding, randomized font sizes, or text squishing, producing a high-end, professional UI.

## 2. Global Conversational Assistant Architecture
*   **Location:** Lift state and drawer rendering from `Dashboard.jsx` to `Layout.jsx` (which wraps all protected routes).
*   **State lifted:**
    *   `quickPanelOpen`: controlling drawer visibility.
    *   `quickText`: input text.
    *   `quickLoading`: status during classification request.
    *   `quickMessage`: success/error feedback banner.
    *   `quickContext`: AI context for incomplete parameters (holding partially parsed transactions).
    *   `chatHistory`: array of dialogue turns (User & AI).
*   **Logic:**
    *   `handleQuickAdd`: sends inputs to `/api/financials/quick-add`, parses response, handles follow-up prompts from Gemini, and records transaction details.
    *   `handleResetQuickAdd`: resets history and clears context.
*   **Data Synchronization:**
    *   When the assistant successfully creates a transaction, it dispatches a window-level event:
        `window.dispatchEvent(new CustomEvent('scan-complete'));`
    *   All core pages (`Dashboard.jsx`, `Financials.jsx`, `Workers.jsx`, `Invoices.jsx`) will listen to `'scan-complete'` and automatically invoke their data-fetching functions. This ensures that when a transaction is logged from any screen, the currently active screen instantly updates its displayed metrics/tables.

## 3. Global Floating Action Button (FAB)
*   **Trigger:** Floating button rendered in the bottom-right viewport (`fixed bottom-6 right-6 z-40`).
*   **Aesthetics:**
    *   Background: Indigo-600 (`bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600`).
    *   Text and Icon: White text with a `Sparkles` icon.
    *   Shadow: Indigo shadow glow (`shadow-2xl shadow-indigo-600/30 dark:shadow-indigo-500/20`).
    *   Animations: Hover scale-up (`hover:scale-105`), active click press (`active:scale-95`), transition-all, group-hover enhancements.
*   **Responsive layout:**
    *   Desktop/Tablet: Capsule button containing both the Sparkles icon and "Saisie Rapide IA" text.
    *   Mobile (`xs` and `sm` screen sizes): Circular floating action button showing only the Sparkles icon to prevent screen crowding.

## 4. Button Standardization Spec
To remove randomized button paddings, heights, and fonts:
*   **Header / Primary Buttons:**
    *   Standardized Tailwind class: `px-4 py-2.5 text-sm font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all`
    *   All header rows on `Dashboard.jsx`, `Financials.jsx`, and `Workers.jsx` will be aligned to this exact spec.
    *   Mobile wraps will change container classes to use `flex flex-wrap items-center gap-2` (eliminating `space-x-2.5` which prevents proper wrapping).
*   **Modal / Form Buttons (Cancel & Submit side-by-side):**
    *   Standard height: `py-2.5` (matching inputs and standard headers).
    *   Radius: `rounded-xl`.
    *   Font size: `text-sm font-bold`.
    *   Cancel Styling: `flex-1 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors`
    *   Filing/Approve Styling: `flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md`
    *   Reject/Ban Styling: `flex-1 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold border border-red-100 dark:border-red-800/50 hover:border-red-200 transition-all shadow-sm`
*   **Inline Table Buttons (e.g. Pay button in Workers table):**
    *   Standardized Tailwind class: `px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5 transition-all`
    *   Ensures consistent vertical size and typography inside tables.
