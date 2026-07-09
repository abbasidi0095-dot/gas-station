import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { UploadCloud, X, RefreshCw, Fuel, Check, Ban, ImageIcon, AlertCircle, ChevronRight } from 'lucide-react';

export default function SoldGas() {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0, errors: 0 });
  const fileInputRef = useRef(null);

  // Carousel state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [vVendorId, setVVendorId] = useState('');
  const [vAmount, setVAmount] = useState('');
  const [vDate, setVDate] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const vRes = await fetch('/api/financials/vendors');
      if (vRes.ok) setVendors(await vRes.json());
      const qRes = await fetch('/api/receipts/sold-gas/queue');
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueue(qData);
        if (qData.length > 0) loadReceipt(qData[0]);
        else { setCurrentIdx(0); setVVendorId(''); setVAmount(''); setVDate(''); setVDescription(''); }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const loadReceipt = (rc) => {
    setVVendorId(rc.vendorId || '');
    setVAmount(rc.amount != null ? String(rc.amount) : '');
    setVDate(rc.scannedAt ? rc.scannedAt.split('T')[0] : new Date().toISOString().split('T')[0]);
    setVDescription(rc.extractedRawText || '');
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles(selected);
      setUploadProgress({ done: 0, total: selected.length, errors: 0 });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) {
      setFiles(dropped);
      setUploadProgress({ done: 0, total: dropped.length, errors: 0 });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length, errors: 0 });
    const formData = new FormData();
    files.forEach((f) => formData.append('receipts', f));

    try {
      const res = await fetch('/api/receipts/scan-bulk', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk upload failed.');

      let errors = 0;
      if (data.results) {
        errors = data.results.filter((r) => !r.success).length;
      }
      setUploadProgress({ done: files.length, total: files.length, errors });
      setFiles([]);
      await fetchQueue();
    } catch (err) {
      alert(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleAction = async (status) => {
    if (!currentReceipt) return;
    setSubmitting(true);
    try {
      const payload = {
        status,
        vendorId: status === 'confirmed' ? vVendorId : undefined,
        amount: status === 'confirmed' ? vAmount : undefined,
        date: status === 'confirmed' ? vDate : undefined,
        description: status === 'confirmed' ? vDescription : undefined,
      };
      const res = await fetch(`/api/receipts/sold-gas/review/${currentReceipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const nextIdx = currentIdx >= queue.length - 1 ? currentIdx - 1 : currentIdx;
      await fetchQueue();
      if (nextIdx >= 0 && nextIdx < queue.length - 1) {
        setCurrentIdx(Math.max(0, nextIdx));
      } else {
        setCurrentIdx(0);
      }
    } catch (err) {
      alert(err.message || 'Error processing review.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentReceipt = queue[currentIdx];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Fuel className="h-7 w-7 text-emerald-600" />
          <span>{t('soldGas')}</span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t('soldGasDesc')}</p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="w-full py-10 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center p-6 group"
        >
          {uploading ? (
            <div className="flex flex-col items-center text-center">
              <RefreshCw className="h-12 w-12 text-emerald-600 mb-4 animate-spin" />
              <p className="text-sm font-semibold text-slate-800">{t('processingReceipts')}</p>
              <p className="text-xs text-slate-400 mt-1">{uploadProgress.done} / {uploadProgress.total}</p>
            </div>
          ) : (
            <>
              <UploadCloud className="h-12 w-12 text-slate-400 group-hover:text-emerald-600 mb-4" />
              <p className="text-sm font-semibold text-slate-700">{t('soldGasDrop')}</p>
              <span className="text-xs text-slate-400 mt-1">{t('soldGasFileTypes')}</span>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,application/pdf"
            multiple
            className="hidden"
          />
        </div>

        {files.length > 0 && !uploading && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{files.length} {t('receiptsSelected')}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm flex items-center space-x-2 transition-all shadow-md"
              >
                <UploadCloud className="h-4 w-4" />
                <span>{t('scanAll')}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                  {f.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }}
                    className="absolute top-1 right-1 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadProgress.done > 0 && !uploading && (
          <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 text-sm font-medium ${uploadProgress.errors > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {uploadProgress.errors > 0 ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            <span>{uploadProgress.done - uploadProgress.errors} {t('processedOk')}{uploadProgress.errors > 0 ? `, ${uploadProgress.errors} ${t('processedFailed')}` : ''}</span>
          </div>
        )}
      </div>

      {/* Approval Carousel */}
      {loading ? (
        <div className="w-full py-12 flex justify-center items-center space-x-2">
          <RefreshCw className="h-5 w-5 text-emerald-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-500">{t('loadingQueue')}</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 max-w-fit mx-auto mb-4"><Fuel className="h-10 w-10" /></div>
          <h3 className="font-bold text-slate-900 text-lg">{t('soldGasQueueClear')}</h3>
          <p className="text-sm text-slate-500 mt-2">{t('soldGasQueueClearDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('reviewing')}</span>
              <span className="text-sm font-black text-slate-900">{currentIdx + 1}</span>
              <span className="text-sm text-slate-400">{t('of')}</span>
              <span className="text-sm font-bold text-slate-700">{queue.length}</span>
            </div>
            <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${((currentIdx + 1) / queue.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-600">{Math.round(((currentIdx + 1) / queue.length) * 100)}%</span>
          </div>

          {/* Carousel item */}
          {currentReceipt && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              {/* Left: Receipt image */}
              <div className="bg-slate-900 rounded-xl overflow-hidden flex flex-col justify-between p-2 relative aspect-[3/4] max-h-[520px]">
                <div className="flex-1 flex items-center justify-center p-2 bg-slate-950 rounded-lg overflow-hidden">
                  <img src={currentReceipt.imageUrl} alt="Receipt" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {currentReceipt.confidenceScore != null && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${currentReceipt.confidenceScore >= 0.8 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {(currentReceipt.confidenceScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Editable form + actions */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-md">{t('soldGasApproveTitle')}</h3>
                    <p className="text-xs text-slate-400">{t('soldGasApproveDesc')}</p>
                  </div>

                  {currentReceipt.extractedRawText && (
                    <div className="bg-slate-50 rounded-lg p-2 max-h-20 overflow-y-auto border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap line-clamp-3">{currentReceipt.extractedRawText}</p>
                    </div>
                  )}

                  <div className="space-y-3 font-medium text-slate-800 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('vendor')}</span>
                      <select value={vVendorId} onChange={(e) => setVVendorId(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm">
                        <option value="">{t('unassigned')}</option>
                        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('verifyAmount')}</span>
                        <input type="number" step="0.01" min="0" value={vAmount} onChange={(e) => setVAmount(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('receiptDate')}</span>
                        <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('notesRemarks')}</span>
                      <textarea rows="2" value={vDescription} onChange={(e) => setVDescription(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex space-x-2">
                  <button
                    onClick={() => handleAction('rejected')}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Ban className="h-4 w-4" />
                    <span>{t('reject')}</span>
                  </button>
                  <button
                    onClick={() => handleAction('confirmed')}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>{t('approveSoldGas')}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Thumbnails nav */}
          {queue.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {queue.map((rc, i) => (
                <button
                  key={rc.id}
                  onClick={() => { setCurrentIdx(i); loadReceipt(rc); }}
                  className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === currentIdx ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
                >
                  <img src={rc.imageUrl} alt="thumb" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
