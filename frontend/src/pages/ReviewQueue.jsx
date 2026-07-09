import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ClipboardCheck, Check, Ban, Eye, RefreshCw } from 'lucide-react';

const REVIEW_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];

export default function ReviewQueue() {
  const { t, catLabel } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [amount, setAmount] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('fuel_purchase');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueueAndVendors = async () => {
    setLoading(true);
    try {
      const vRes = await fetch('/api/financials/vendors');
      if (vRes.ok) setVendors(await vRes.json());
      const qRes = await fetch('/api/receipts/queue');
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueue(qData);
        if (qData.length > 0) selectReceiptForReview(qData[0]);
        else setSelectedReceipt(null);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQueueAndVendors(); }, []);

  const selectReceiptForReview = (rc) => {
    setSelectedReceipt(rc);
    setAmount(rc.amount || '');
    setVendorId(rc.vendorId || '');
    setDate(rc.scannedAt ? rc.scannedAt.split('T')[0] : '');
    setDescription(rc.extractedRawText || '');
  };

  const handleReviewAction = async (status) => {
    if (!selectedReceipt) return;
    setSubmitting(true);
    const payload = { status, vendorId: status === 'confirmed' ? vendorId : undefined, amount: status === 'confirmed' ? amount : undefined, date: status === 'confirmed' ? date : undefined, category: status === 'confirmed' ? category : undefined, description: status === 'confirmed' ? description : undefined };
    try {
      const res = await fetch(`/api/receipts/review/${selectedReceipt.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchQueueAndVendors();
    } catch (err) { alert(err.message || 'Error processing review decision.'); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('reviewQueueTitle')}</h2>
        <p className="text-sm text-slate-500">{t('reviewQueueDesc')}</p>
      </div>

      {loading ? (
        <div className="w-full py-12 flex justify-center space-x-2">
          <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-500">{t('loadingQueue')}</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 max-w-fit mx-auto mb-4"><ClipboardCheck className="h-10 w-10 animate-bounce" /></div>
          <h3 className="font-bold text-slate-900 text-lg">{t('queueClear')}</h3>
          <p className="text-sm text-slate-500 mt-2">{t('queueClearDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-xs tracking-wider uppercase">{t('pendingTickets')} ({queue.length})</div>
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {queue.map((rc) => {
                const isSelected = selectedReceipt?.id === rc.id;
                return (
                  <div key={rc.id} onClick={() => selectReceiptForReview(rc)} className={`p-4 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-slate-900 truncate max-w-[150px]">{rc.vendor ? rc.vendor.name : t('unknownVendor')}</h4>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">{(((rc.confidenceScore ?? 0) * 100).toFixed(0))}{t('matchPct')}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t('uploaded')}: {new Date(rc.scannedAt).toLocaleString()}</p>
                    <p className="text-sm font-bold text-slate-800 mt-2">{rc.amount != null ? `${rc.amount.toFixed(2)} ${rc.currency || 'MAD'}` : t('amountNA')}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedReceipt && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="bg-slate-900 rounded-xl overflow-hidden flex flex-col justify-between p-2 relative aspect-[3/4] max-h-[500px]">
                <div className="flex-1 flex items-center justify-center p-2 bg-slate-950 rounded-lg overflow-hidden">
                  <img src={selectedReceipt.imageUrl} alt="Receipt" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-full text-slate-300 backdrop-blur-md"><Eye className="h-4 w-4" /></div>
              </div>

              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-md">{t('auditForm')}</h3>
                    <p className="text-xs text-slate-400">{t('auditFormDesc')}</p>
                  </div>
                  <div className="space-y-3 font-medium text-slate-800 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('verifyAmount')}</span>
                      <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('assignVendor')}</span>
                      <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm">
                        <option value="">{t('unassigned')}</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('receiptDate')}</span>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('filingCategory')}</span>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm">
                        {REVIEW_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex space-x-2">
                  <button onClick={() => handleReviewAction('rejected')} disabled={submitting} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5"><Ban className="h-4 w-4" /><span>{t('reject')}</span></button>
                  <button onClick={() => handleReviewAction('confirmed')} disabled={submitting} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-1.5"><Check className="h-4 w-4" /><span>{t('approveLedger')}</span></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
