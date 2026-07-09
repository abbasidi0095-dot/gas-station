import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { UploadCloud, X, RefreshCw, Fuel, Check, Ban, AlertCircle, ChevronLeft, ChevronRight, ImageIcon, ScanLine, Plus } from 'lucide-react';
import { Dropzone } from '@/components/ui/dropzone';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

export default function SoldGas() {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0, errors: 0 });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [vVendorId, setVVendorId] = useState('');
  const [vAmount, setVAmount] = useState('');
  const [vDate, setVDate] = useState('');
  const [vFuelType, setVFuelType] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const thumbRef = useRef(null);

  // Manual entry modal state for Sold Gas
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [mAmount, setMAmount] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mFuelType, setMFuelType] = useState('gasoil');
  const [mVendorId, setMVendorId] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, qRes] = await Promise.all([
        fetch('/api/financials/vendors'),
        fetch('/api/receipts/sold-gas/queue'),
      ]);
      if (vRes.ok) setVendors(await vRes.json());
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueue(qData);
        if (qData.length > 0) loadReceipt(qData[0]);
        else { setCurrentIdx(0); setVVendorId(''); setVAmount(''); setVDate(''); setVFuelType(''); setVDescription(''); }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  const handleSaveManual = async (e) => {
    e.preventDefault();
    setManualSubmitting(true);
    try {
      const res = await fetch('/api/receipts/sold-gas/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: mVendorId || null,
          amount: parseFloat(mAmount),
          date: mDate,
          fuelType: mFuelType,
          description: mDescription || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la saisie.');
      setManualModalOpen(false);
      setMAmount('');
      setMDate(new Date().toISOString().split('T')[0]);
      setMFuelType('gasoil');
      setMVendorId('');
      setMDescription('');
      fetchQueue();
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setManualSubmitting(false);
    }
  };

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const loadReceipt = (rc) => {
    setVVendorId(rc.vendorId || '');
    setVAmount(rc.amount != null ? String(rc.amount) : '');
    setVDate(rc.date || (rc.scannedAt ? rc.scannedAt.split('T')[0] : ''));
    setVFuelType(rc.fuelType || 'gasoil');
    setVDescription(rc.extractedRawText || '');
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
      if (data.results) errors = data.results.filter((r) => !r.success).length;
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
        fuelType: status === 'confirmed' ? vFuelType : undefined,
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
      setCurrentIdx(Math.max(0, Math.min(nextIdx, queue.length - 2)));
    } catch (err) {
      alert(err.message || 'Error processing review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 20));
  }, []);

  const removeFile = useCallback((idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const currentReceipt = queue[currentIdx];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center space-x-2">
            <Fuel className="h-7 w-7 text-emerald-600" />
            <span>{t('soldGas')}</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('soldGasDesc')}</p>
        </div>
        <div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Saisie Manuelle</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-5">
        <Dropzone
          src={files}
          onDrop={handleDrop}
          onRemove={removeFile}
          accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 'application/pdf': ['.pdf'] }}
          maxSize={10 * 1024 * 1024}
          maxFiles={20}
          disabled={uploading}
        />
        {files.length > 0 && !uploading && (
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={handleUpload}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30"
            >
              <ScanLine className="h-4 w-4" />
              <span>{t('scanAll')} ({files.length})</span>
            </button>
          </div>
        )}
        {uploadProgress.done > 0 && !uploading && (
          <div className={`mt-4 p-3 rounded-xl flex items-center space-x-2 text-sm font-medium ${uploadProgress.errors > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {uploadProgress.errors > 0 ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
            <span>{uploadProgress.done - uploadProgress.errors} {t('processedOk')}{uploadProgress.errors > 0 ? `, ${uploadProgress.errors} ${t('processedFailed')}` : ''}</span>
          </div>
        )}
      </div>

      {/* Approval Carousel */}
      {loading ? (
        <div className="w-full py-16 flex flex-col items-center space-y-3">
          <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">{t('loadingQueue')}</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="max-w-lg mx-auto text-center py-16 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-500 inline-flex mb-4">
            <Fuel className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">{t('soldGasQueueClear')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">{t('soldGasQueueClearDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          {/* Progress bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm px-5 py-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('reviewing')}</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-black text-slate-900 dark:text-slate-50">{currentIdx + 1}</span>
                <span className="text-sm text-slate-400 dark:text-slate-500">/</span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{queue.length}</span>
              </div>
            </div>
            <div className="flex-1 mx-5 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentIdx + 1) / queue.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg">
              {Math.round(((currentIdx + 1) / queue.length) * 100)}%
            </span>
          </div>

          {/* Carousel card */}
          {currentReceipt && (
            <div className="relative">
              <Carousel
                className="w-full"
                opts={{ startIndex: currentIdx, loop: false }}
                setApi={(api) => {
                  api?.on('select', () => {
                    const idx = api.selectedScrollSnap();
                    setCurrentIdx(idx);
                    loadReceipt(queue[idx]);
                  });
                }}
              >
                <CarouselContent>
                  {queue.map((rc, i) => (
                    <CarouselItem key={rc.id}>
                      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-5 overflow-hidden ${i === currentIdx ? '' : 'pointer-events-none'}`}>
                        {/* Receipt image */}
                        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-xl overflow-hidden flex items-center justify-center min-h-[380px] max-h-[560px]">
                          <img
                            src={rc.imageUrl}
                            alt="Receipt"
                            className="max-h-full max-w-full object-contain p-3 select-none"
                            draggable={false}
                          />
                          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4))]" />
                          {rc.confidenceScore != null && (
                            <div className="absolute top-3 right-3">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                                rc.confidenceScore >= 0.8
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {(rc.confidenceScore * 100).toFixed(0)}% match
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Form (only interactive on current slide) */}
                        <div className="flex flex-col justify-between space-y-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-slate-50">{t('soldGasApproveTitle')}</h3>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{t('soldGasApproveDesc')}</p>
                              {rc.user && (
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                                  Saisi par : <span className="text-emerald-600 dark:text-emerald-400">{rc.user.name}</span>
                                </p>
                              )}
                            </div>

                            {rc.extractedRawText && (
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 max-h-24 overflow-y-auto border border-slate-100 dark:border-slate-700/50">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono whitespace-pre-wrap leading-relaxed">{rc.extractedRawText}</p>
                              </div>
                            )}

                            <div className="space-y-3.5">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">{t('vendor')}</label>
                                <select value={i === currentIdx ? vVendorId : ''} onChange={(e) => i === currentIdx && setVVendorId(e.target.value)} disabled={i !== currentIdx} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                  <option value="">{t('unassigned')}</option>
                                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Fuel</label>
                                  <select value={i === currentIdx ? vFuelType : ''} onChange={(e) => i === currentIdx && setVFuelType(e.target.value)} disabled={i !== currentIdx} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="gasoil">Gasoil</option>
                                    <option value="essence">Essence</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">{t('verifyAmount')}</label>
                                  <input type="number" step="0.01" min="0" value={i === currentIdx ? vAmount : ''} onChange={(e) => i === currentIdx && setVAmount(e.target.value)} disabled={i !== currentIdx} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all disabled:opacity-50" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">{t('receiptDate')}</label>
                                  <input type="date" value={i === currentIdx ? vDate : ''} onChange={(e) => i === currentIdx && setVDate(e.target.value)} disabled={i !== currentIdx} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all disabled:opacity-50" />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">{t('notesRemarks')}</label>
                                <textarea rows={2} value={i === currentIdx ? vDescription : ''} onChange={(e) => i === currentIdx && setVDescription(e.target.value)} disabled={i !== currentIdx} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all resize-none disabled:opacity-50" />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 flex space-x-3">
                            <button
                              onClick={() => handleAction('rejected')}
                              disabled={submitting || i !== currentIdx}
                              className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 border border-red-100 dark:border-red-800/50 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Ban className="h-4 w-4" />
                              <span>{t('reject')}</span>
                            </button>
                            <button
                              onClick={() => handleAction('confirmed')}
                              disabled={submitting || i !== currentIdx}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              <span>{t('approveSoldGas')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden lg:flex -left-4 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600" />
                <CarouselNext className="hidden lg:flex -right-4 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600" />
              </Carousel>
            </div>
          )}

          {/* Thumbnail navigation */}
          {queue.length > 1 && (
            <div className="relative">
              <div
                ref={thumbRef}
                className="flex gap-2 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {queue.map((rc, i) => (
                  <button
                    key={rc.id}
                    onClick={() => { setCurrentIdx(i); loadReceipt(rc); }}
                    className={`snap-start shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      i === currentIdx
                        ? 'border-emerald-600 ring-2 ring-emerald-200 shadow-md scale-105'
                        : 'border-slate-200 dark:border-slate-600 opacity-60 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <img src={rc.imageUrl} alt={`Receipt ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Manual Sold Gas Entry Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all duration-300">
          <form onSubmit={handleSaveManual} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/45">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-50 text-md">Saisie Manuelle - Vente de Carburant</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Enregistrer un bon de vente de carburant manuellement</p>
              </div>
              <button type="button" onClick={() => setManualModalOpen(false)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Montant (DH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={mAmount}
                    onChange={(e) => setMAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Type de Carburant</label>
                  <select
                    value={mFuelType}
                    onChange={(e) => setMFuelType(e.target.value)}
                    required
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="gasoil">Gasoil (Diesel)</option>
                    <option value="essence">Essence (Sans Plomb)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Client / Fournisseur</label>
                  <select
                    value={mVendorId}
                    onChange={(e) => setMVendorId(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Sélectionner un client</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Notes facultatives sur la vente..."
                  value={mDescription}
                  onChange={(e) => setMDescription(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/45 border-t border-slate-100 dark:border-slate-800 flex space-x-3">
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={manualSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {manualSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Enregistrer</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
