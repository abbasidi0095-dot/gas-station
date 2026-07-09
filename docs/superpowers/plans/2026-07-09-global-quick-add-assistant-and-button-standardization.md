# Global Quick Add Assistant and Button Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a global, floating conversational AI Saisie Rapide (IA) assistant and standardize all button paddings, font sizes, shapes, and behaviors across the platform to deliver an elite, unified, and responsive experience.

**Architecture:** Lift Saisie Rapide (IA) state and UI from `Dashboard.jsx` to `Layout.jsx` and render it as a floating action button (FAB) in the bottom-right corner of the viewport. Propagate refresh signals via a custom `'scan-complete'` event to all pages. Standardize all buttons into precise primary/secondary/inline styling specs.

**Tech Stack:** React, Tailwind CSS, Lucide icons, Express backend, Prisma.

---

## Task 1: Lift Saisie Rapide State and Render Floating Drawer in Layout

**Files:**
- Modify: `/home/ubuntu/gas/frontend/src/components/Layout.jsx`
- Modify: `/home/ubuntu/gas/frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Read Layout.jsx first to locate sidebar and wrapper nodes.**
- [ ] **Step 2: Edit Layout.jsx to add state variables and handlers for conversational AI Saisie Rapide.**
Add `quickPanelOpen`, `quickText`, `quickLoading`, `quickMessage`, `quickContext`, `chatHistory`. Add `handleQuickAdd` which calls `/api/financials/quick-add`, dispatches custom event `'scan-complete'` upon complete transactions, and `handleResetQuickAdd`.
Add listener on window for event `'open-quick-add'` to set `quickPanelOpen(true)`.

```javascript
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickMessage, setQuickMessage] = useState(null);
  const [quickContext, setQuickContext] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    const handleOpen = () => {
      handleResetQuickAdd();
      setQuickPanelOpen(true);
    };
    window.addEventListener('open-quick-add', handleOpen);
    return () => window.removeEventListener('open-quick-add', handleOpen);
  }, []);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickText.trim()) return;

    const userMsg = quickText;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setQuickLoading(true);
    setQuickText('');
    setQuickMessage(null);

    try {
      const res = await fetch('/api/financials/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMsg, context: quickContext }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erreur lors du traitement par l\'IA.');

      if (resData.status === 'incomplete') {
        setQuickContext(resData.context);
        setChatHistory(prev => [...prev, {
          sender: 'ai',
          text: resData.prompt,
          partial: resData.context.partialTransaction
        }]);
      } else {
        setQuickContext(null);
        setChatHistory(prev => [...prev, { sender: 'ai', text: resData.message, isComplete: true }]);
        setQuickMessage({ type: 'success', text: resData.message });
        window.dispatchEvent(new CustomEvent('scan-complete'));
      }
    } catch (err) {
      console.error(err);
      setQuickMessage({ type: 'error', text: err.message });
      setChatHistory(prev => [...prev, { sender: 'ai', text: `Erreur: ${err.message}`, isError: true }]);
    } finally {
      setQuickLoading(false);
    }
  };

  const handleResetQuickAdd = () => {
    setQuickText('');
    setQuickContext(null);
    setChatHistory([]);
    setQuickMessage(null);
  };
```

- [ ] **Step 3: Render Floating Action Button and Drawer in Layout.jsx.**
Add the Saisie Rapide (IA) FAB in the bottom right:
```jsx
      {/* Floating Saisie Rapide (IA) Button */}
      <button
        onClick={() => { handleResetQuickAdd(); setQuickPanelOpen(true); }}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-3.5 rounded-full shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all group"
        title="Saisie Rapide IA"
      >
        <Sparkles className="h-5 w-5 text-indigo-200 group-hover:animate-pulse" />
        <span className="hidden sm:inline-block pr-1">Saisie Rapide IA</span>
      </button>
```
Render Saisie Rapide (IA) Drawer modal inside the layout when `quickPanelOpen` is true.

- [ ] **Step 4: Remove redundant state, handleQuickAdd, and Drawer rendering in Dashboard.jsx.**
Remove state variables `quickPanelOpen`, etc. and replace the Drawer with a simple event dispatch when clicking the header "Saisie Rapide IA" button:
`window.dispatchEvent(new CustomEvent('open-quick-add'));`

- [ ] **Step 5: Verify building and compilation passes.**
Run: `npm run build` in `/home/ubuntu/gas/frontend`
Expected: successful build

---

## Task 2: Standardize Dashboard, Financials, and Workers Header Rows

**Files:**
- Modify: `/home/ubuntu/gas/frontend/src/pages/Dashboard.jsx`
- Modify: `/home/ubuntu/gas/frontend/src/pages/Financials.jsx`
- Modify: `/home/ubuntu/gas/frontend/src/pages/Workers.jsx`

- [ ] **Step 1: Add subscription to `'scan-complete'` in pages.**
Make all pages fetch fresh data on `'scan-complete'` event.
For example in `Dashboard.jsx`:
```javascript
  useEffect(() => {
    window.addEventListener('scan-complete', fetchDashboardData);
    return () => window.removeEventListener('scan-complete', fetchDashboardData);
  }, []);
```
Apply corresponding subscriptions in `Financials.jsx` (listening and calling `fetchData`) and `Workers.jsx` (calling `fetchData`).

- [ ] **Step 2: Standardize Dashboard Header Buttons.**
Edit `Dashboard.jsx`'s top header buttons to use uniform heights (`py-2.5` / `h-11`), text sizes (`text-sm font-bold`), border radius (`rounded-xl`), and use `flex flex-wrap items-center gap-2` on their parent container to guarantee they wrap cleanly on mobile.
```jsx
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-quick-add'))} className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md flex items-center space-x-2 transition-all">
            <Sparkles className="h-4 w-4 text-indigo-400" /><span>Saisie Rapide IA</span>
          </button>
          <button onClick={() => setScannerOpen(true)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center space-x-2 transition-all">
            <Sparkles className="h-4 w-4" /><span>{t('smartScan')}</span>
          </button>
          <button onClick={() => setExportOpen(true)} className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl shadow-sm dark:shadow-slate-900/50 flex items-center space-x-2 transition-all">
            <FileOutput className="h-4 w-4" /><span>{t('exportData')}</span>
          </button>
        </div>
```

- [ ] **Step 3: Standardize Financials Header Buttons.**
Edit `Financials.jsx`'s top buttons to match exactly (changing `text-xs py-2` to `text-sm py-2.5 rounded-xl`):
```jsx
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl shadow-sm dark:shadow-slate-900/50 flex items-center space-x-2 transition-all"
          >
            <FileOutput className="h-4 w-4" />
            <span>{t('exportData')}</span>
          </button>
          <button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === 'charges' ? t('addCharge') : t('logRevenue')}</span>
          </button>
        </div>
```

- [ ] **Step 4: Standardize Workers Header Buttons.**
Edit `Workers.jsx`'s top "Add Staff" button to use identical classes:
```jsx
        <button onClick={() => { setEditingWorker(null); setWorkerModalOpen(true); }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center space-x-2 transition-all">
          <Plus className="h-4 w-4" /><span>{t('addStaff')}</span>
        </button>
```

- [ ] **Step 5: Verify build.**
Run: `npm run build` in `/home/ubuntu/gas/frontend`
Expected: successful build

---

## Task 3: Standardize Dialog Form Buttons (Cancel & Submit) and Inline Table Actions

**Files:**
- Modify: `/home/ubuntu/gas/frontend/src/components/ExportModal.jsx`
- Modify: `/home/ubuntu/gas/frontend/src/pages/Workers.jsx`
- Modify: `/home/ubuntu/gas/frontend/src/pages/ReviewQueue.jsx`
- Modify: `/home/ubuntu/gas/frontend/src/pages/Financials.jsx`

- [ ] **Step 1: Standardize ExportModal Buttons.**
Standardize the bottom cancel and export buttons to have identical vertical height, text sizes, rounded edges, and perfect side-by-side spacing.
```jsx
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex space-x-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors">{t('cancel')}</button>
          <button type="button" onClick={handleTriggerExport} disabled={exporting} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all ${format === 'excel' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
            {exporting ? t('generating') : `${t('exportTo')} ${format.toUpperCase()}`}
          </button>
        </div>
```

- [ ] **Step 2: Standardize Workers Modal Form Buttons.**
Update Cancel and Save buttons at the bottom of the Worker form modal (lines 265-266):
```jsx
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex space-x-3">
              <button type="button" onClick={() => setWorkerModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md">{t('save')}</button>
            </div>
```

- [ ] **Step 3: Standardize Financials Modal Form Buttons.**
Update Cancel and Save buttons at the bottom of the Financials form modal (lines 344-345):
```jsx
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md">{t('confirmEntry')}</button>
```

- [ ] **Step 4: Standardize ReviewQueue Audit Buttons.**
Update Reject and Approve buttons at the bottom of the audit pane (lines 137-138):
```jsx
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 flex space-x-3">
                  <button onClick={() => handleReviewAction('rejected')} disabled={submitting} className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 border border-red-100 dark:border-red-800/50 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed"><Ban className="h-4 w-4" /><span>{t('reject')}</span></button>
                  <button onClick={() => handleReviewAction('confirmed')} disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-30 disabled:cursor-not-allowed"><Check className="h-4 w-4" /><span>{t('approveLedger')}</span></button>
                </div>
```

- [ ] **Step 5: Standardize Workers Table Inline Actions.**
Ensure the row payment button ("Payé") uses standardized text size and padding:
```jsx
                          <button onClick={() => handlePaid(w.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5 transition-all">
                            <DollarSign className="h-3 w-3" /><span>Payé</span>
                          </button>
```

---

## Task 4: Standardize ReceiptScanner Layout Buttons

**Files:**
- Modify: `/home/ubuntu/gas/frontend/src/components/ReceiptScanner.jsx`

- [ ] **Step 1: Read ReceiptScanner.jsx buttons.**
Audit and standardize camera actions and confirmation buttons.

- [ ] **Step 2: Standardize Scan / Confirm OCR Filing Buttons.**
Update Confirm and Add Another buttons (lines 297-308):
```jsx
                    <button
                      onClick={handleConfirmFile}
                      disabled={filing}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md"
                    >
                      {filing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>{filing ? t('filing') : t('confirmFile')}</span>
                    </button>
                    <button
                      onClick={resetAll}
                      disabled={filing}
                      className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-xl text-sm transition-all border border-slate-200 dark:border-slate-700"
                    >
                      {t('addAnother')}
                    </button>
```

- [ ] **Step 3: Standardize Manual Entry Submit Button.**
Update Submit button (line 449):
```jsx
              <button type="submit" disabled={manualSubmitting} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md">
                {manualSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{manualSubmitting ? t('filing') : t('fileReceipt')}</span>
              </button>
```

- [ ] **Step 4: Standardize camera capture buttons.**
```jsx
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 z-10">
                        <button type="button" onClick={capturePhoto} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center space-x-2 shadow-lg"><Camera className="h-4 w-4" /><span>{t('useCamera')}</span></button>
                        <button type="button" onClick={stopCamera} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-colors">{t('cancel')}</button>
                      </div>
```

- [ ] **Step 5: Standardize camera trigger buttons (idle state).**
```jsx
                      <div className="w-full flex space-x-3 mt-6">
                        <button type="button" onClick={startCamera} className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all"><Camera className="h-4 w-4" /><span>{t('useCamera')}</span></button>
                        {file && (
                          <button type="button" onClick={handleScanUpload} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md"><Sparkles className="h-4 w-4" /><span>{t('analyzeAI')}</span></button>
                        )}
                      </div>
```

---

## Task 5: Compilation and Production Verification

**Files:**
- N/A

- [ ] **Step 1: Compile Vite app.**
Run: `npm run build` in `/home/ubuntu/gas/frontend`
Expected: zero errors, output built statically into `frontend/dist/`.

- [ ] **Step 2: Restart Al Mohit service.**
Run: `sudo systemctl restart almohit.service`
Expected: active and running.
