import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Camera, UploadCloud, X, RefreshCw, Sparkles, CheckCircle2, AlertCircle, FileText, ScanLine, Edit3 } from 'lucide-react';

const SCAN_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];

export default function ReceiptScanner({ onClose, onScanComplete }) {
  const { t, catLabel } = useLanguage();
  const [mode, setMode] = useState('scan');
  const [file, setFile] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [verifyMode, setVerifyMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const [vendors, setVendors] = useState([]);
  // Verify fields (populated by OCR)
  const [vVendorId, setVVendorId] = useState('');
  const [vAmount, setVAmount] = useState('');
  const [vDate, setVDate] = useState('');
  const [vCategory, setVCategory] = useState('fuel_purchase');
  const [vDescription, setVDescription] = useState('');
  const [vConfidence, setVConfidence] = useState(0);
  const [filing, setFiling] = useState(false);

  // Manual entry fields
  const [manualVendor, setManualVendor] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualCategory, setManualCategory] = useState('fuel_purchase');
  const [manualDesc, setManualDesc] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const filePreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); }, [filePreviewUrl]);

  React.useEffect(() => {
    if ((mode === 'manual' || verifyMode) && vendors.length === 0) {
      fetch('/api/financials/vendors')
        .then(r => r.json())
        .then(data => setVendors(data))
        .catch(() => {});
    }
  }, [mode, verifyMode, vendors.length]);

  const startCamera = async () => {
    setUseCamera(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera access failed:', err);
      alert(t('cameraFailed'));
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const capturedFile = new File([blob], 'captured-receipt.jpg', { type: 'image/jpeg' });
        setFile(capturedFile);
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setScanResult(null);
    }
  };

  const handleScanUpload = async () => {
    if (!file) return;
    setScanning(true);
    setScanResult(null);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/receipts/scan', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server failed to analyze receipt.');

      // Populate verify fields from OCR result
      const scanItem = data.results && data.results[0];
      const receipt = scanItem ? scanItem.receipt : data.receipt;
      setVVendorId(receipt.vendorId || '');
      setVAmount(receipt.amount != null ? String(receipt.amount) : '');
      setVDate(receipt.date || (receipt.scannedAt ? receipt.scannedAt.split('T')[0] : ''));
      setVCategory('fuel_purchase');
      setVDescription('');
      setVConfidence(receipt.confidenceScore || 0);
      setVerifyMode(true);
      setScanResult({ success: true, autoFiled: scanItem ? scanItem.autoFiled : data.autoFiled, receipt, message: data.message });
      if (onScanComplete) onScanComplete();
    } catch (err) {
      console.error(err);
      setScanResult({ success: false, message: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Confirm & file the OCR receipt to the ledger
  const handleConfirmFile = async () => {
    if (!scanResult?.receipt) return;
    setFiling(true);
    try {
      const res = await fetch(`/api/receipts/review/${scanResult.receipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'confirmed',
          vendorId: vVendorId || undefined,
          amount: vAmount,
          date: vDate,
          category: vCategory,
          description: vDescription || `Confirmed from OCR scan (${(vConfidence * 100).toFixed(0)}% confidence)`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file receipt.');
      resetAll();
    } catch (err) {
      alert(err.message || 'Failed to file receipt.');
    } finally {
      setFiling(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualAmount || !manualDate) {
      alert(t('amountDateRequired'));
      return;
    }
    setManualSubmitting(true);
    const formData = new FormData();
    formData.append('vendorId', manualVendor);
    formData.append('amount', manualAmount);
    formData.append('date', manualDate);
    formData.append('category', manualCategory);
    formData.append('description', manualDesc);
    if (file) formData.append('receipt', file);

    try {
      const res = await fetch('/api/receipts/manual', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScanResult({ success: true, autoFiled: true, receipt: data.receipt, message: data.message });
      if (onScanComplete) onScanComplete();
    } catch (err) {
      setScanResult({ success: false, message: err.message });
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const resetAll = () => {
    setFile(null);
    setScanResult(null);
    setVerifyMode(false);
    setVVendorId(''); setVAmount(''); setVDate(''); setVDescription(''); setVConfidence(0); setVCategory('fuel_purchase');
    setManualAmount(''); setManualDate(''); setManualDesc(''); setManualVendor('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-lg">{t('receiptEntry')}</h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs (hidden during verify) */}
        {!verifyMode && !scanResult && (
          <div className="flex border-b border-slate-100 shrink-0">
            <button
              onClick={() => { setMode('scan'); setFile(null); }}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
                mode === 'scan' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ScanLine className="h-4 w-4" />
              <span>{t('aiScan')}</span>
            </button>
            <button
              onClick={() => { setMode('manual'); setFile(null); }}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
                mode === 'manual' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>{t('manualEntry')}</span>
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 flex flex-col">
          {/* VERIFY MODE: Split-pane OCR data entry */}
          {verifyMode && scanResult?.receipt ? (
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <Edit3 className="h-5 w-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-md">{t('ocrResults')}</h4>
                  <p className="text-xs text-slate-400">{t('ocrResultsDesc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Receipt image */}
                <div className="bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-2 aspect-[3/4] max-h-[420px]">
                  <img
                    src={scanResult.receipt.imageUrl}
                    alt="Receipt"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* Right: Editable form */}
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('confidence')}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${vConfidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {(vConfidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('vendor')}</label>
                    <select value={vVendorId} onChange={(e) => setVVendorId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                      <option value="">{t('selectVendor')}</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('amount')}</label>
                      <input type="number" step="0.01" value={vAmount} onChange={(e) => setVAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('receiptDate')}</label>
                      <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('filingCategory')}</label>
                    <select value={vCategory} onChange={(e) => setVCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                      {SCAN_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('notesRemarks')}</label>
                    <textarea rows="2" value={vDescription} onChange={(e) => setVDescription(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                  </div>

                  <div className="flex flex-col space-y-2 pt-2">
                    <button
                      onClick={handleConfirmFile}
                      disabled={filing}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm flex items-center justify-center space-x-2 transition-all"
                    >
                      {filing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>{filing ? t('filing') : t('confirmFile')}</span>
                    </button>
                    <button
                      onClick={resetAll}
                      disabled={filing}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-all"
                    >
                      {t('addAnother')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Result Display (manual mode) */}
          {scanResult && !verifyMode && (
            <div className="w-full flex flex-col items-center py-2">
              {scanResult.success ? (
                <div className="w-full">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className={`p-3 rounded-full mb-3 ${scanResult.autoFiled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {scanResult.autoFiled ? <CheckCircle2 className="h-10 w-10" /> : <AlertCircle className="h-10 w-10" />}
                    </div>
                    <h4 className="font-bold text-slate-900 text-md">{scanResult.autoFiled ? t('filedSuccess') : t('sentToReview')}</h4>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">{scanResult.message}</p>
                  </div>
                  {scanResult.receipt && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div>
                          <span className="text-slate-400 block text-xs">{t('vendor')}</span>
                          <span className="font-bold text-slate-800">{scanResult.receipt.vendor ? scanResult.receipt.vendor.name : t('unknownVendor')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">{t('amount')}</span>
                          <span className="font-bold text-slate-800">{scanResult.receipt.amount != null ? `${scanResult.receipt.amount.toFixed(2)} MAD / DH` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={resetAll} className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-all">
                    {t('addAnother')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="p-3 bg-red-100 rounded-full text-red-600 mb-3"><AlertCircle className="h-10 w-10" /></div>
                  <h4 className="font-bold text-slate-900 text-md">{t('entryFailed')}</h4>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs">{scanResult.message}</p>
                  <button onClick={resetAll} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all">{t('tryAgain')}</button>
                </div>
              )}
            </div>
          )}

          {/* SCAN MODE */}
          {mode === 'scan' && !scanResult && (
            <>
              {scanning ? (
                <div className="w-full flex flex-col items-center py-8">
                  <div className="relative w-48 aspect-[3/4] max-h-56 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex items-center justify-center p-2 mb-6">
                    {file && <img src={filePreviewUrl} alt="Scanning" className="max-h-full max-w-full object-contain opacity-40 blur-[1px]" />}
                    <div className="absolute left-0 right-0 h-1.5 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-[bounce_2s_infinite] top-0" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
                    <span className="text-slate-800 font-semibold text-md">{t('scanning')}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">{t('scanningDesc')}</p>
                </div>
              ) : (
                <>
                  {useCamera ? (
                    <div className="relative w-full aspect-[3/4] max-h-80 bg-black rounded-xl overflow-hidden border border-slate-800">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 z-10">
                        <button type="button" onClick={capturePhoto} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm flex items-center space-x-2"><Camera className="h-4 w-4" /><span>{t('useCamera')}</span></button>
                        <button type="button" onClick={stopCamera} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-sm">{t('cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center">
                      {file ? (
                        <div className="w-full">
                          <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-2 mb-4">
                            <img src={filePreviewUrl} alt="Receipt preview" className="max-h-full max-w-full object-contain" />
                            <button type="button" onClick={() => setFile(null)} className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full"><X className="h-4 w-4" /></button>
                          </div>
                          <p className="text-sm font-medium text-slate-800 text-center truncate mb-6">{file.name}</p>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center p-6 group">
                          <UploadCloud className="h-12 w-12 text-slate-400 group-hover:text-indigo-600 mb-4" />
                          <p className="text-sm font-semibold text-slate-700">{t('dragDrop')}</p>
                          <span className="text-xs text-slate-400 mt-1">{t('fileTypes')}</span>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" capture="environment" className="hidden" />
                        </div>
                      )}
                      <div className="w-full flex space-x-3 mt-6">
                        <button type="button" onClick={startCamera} className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm flex items-center justify-center space-x-2"><Camera className="h-4 w-4" /><span>{t('useCamera')}</span></button>
                        {file && (
                          <button type="button" onClick={handleScanUpload} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm flex items-center justify-center space-x-2"><Sparkles className="h-4 w-4" /><span>{t('analyzeAI')}</span></button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* MANUAL MODE */}
          {mode === 'manual' && !scanResult && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('vendor')}</label>
                <select value={manualVendor} onChange={(e) => setManualVendor(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                  <option value="">{t('selectVendor')}</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('amount')}</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('date')}</label>
                  <input type="date" required value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('filingCategory')}</label>
                <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                  {SCAN_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('notesRemarks')}</label>
                <textarea rows="2" placeholder={t('notesPlaceholder')} value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('receiptImage')}</label>
                <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold" />
              </div>
              <button type="submit" disabled={manualSubmitting} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm flex items-center justify-center space-x-2">
                {manualSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{manualSubmitting ? t('filing') : t('fileReceipt')}</span>
              </button>
            </form>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
