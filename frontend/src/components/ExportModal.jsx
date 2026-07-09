import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { X, FileSpreadsheet, FileText, Settings } from 'lucide-react';

const EXPORT_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];

export default function ExportModal({ onClose, filters = {} }) {
  const { t, catLabel } = useLanguage();
  const [format, setFormat] = useState('excel');
  const [scope, setScope] = useState(filters.scope || 'combined');
  const [range, setRange] = useState('month');
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [vendorId, setVendorId] = useState(filters.vendorId || '');
  const [category, setCategory] = useState(filters.category || '');
  const [exporting, setExporting] = useState(false);

  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetch('/api/financials/vendors').then(r => r.json()).then(setVendors).catch(() => {});
  }, []);

  // If parent provided custom dates, default range to custom
  useEffect(() => {
    if (filters.startDate && filters.endDate) setRange('custom');
  }, [filters.startDate, filters.endDate]);

  const handleTriggerExport = async () => {
    setExporting(true);
    const params = new URLSearchParams({ range, exportType: scope });
    if (range === 'custom') {
      if (!startDate || !endDate) { alert(t('customDatesRequired')); setExporting(false); return; }
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    if (vendorId) params.append('vendorId', vendorId);
    if (category) params.append('category', category);

    const exportUrl = `/api/export/${format}?${params.toString()}`;
    try {
      const link = document.createElement('a');
      link.href = exportUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => { setExporting(false); onClose(); }, 1000);
    } catch (err) {
      console.error(err);
      alert(t('exportFailed'));
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700/50 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <Settings className="h-5 w-5 text-indigo-600 animate-spin-slow" />
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">{t('exportTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Format */}
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block mb-2">{t('exportFormat')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormat('excel')} className={`py-3 border-2 rounded-xl flex items-center justify-center space-x-2.5 text-sm font-semibold transition-all ${format === 'excel' ? 'border-emerald-500 bg-emerald-50/30 text-emerald-800' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-600 dark:text-slate-400 dark:text-slate-500'}`}>
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" /><span>{t('microsoftExcel')}</span>
              </button>
              <button type="button" onClick={() => setFormat('pdf')} className={`py-3 border-2 rounded-xl flex items-center justify-center space-x-2.5 text-sm font-semibold transition-all ${format === 'pdf' ? 'border-red-500 bg-red-50/30 text-red-800' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-600 dark:text-slate-400 dark:text-slate-500'}`}>
                <FileText className="h-5 w-5 text-red-600" /><span>{t('pdfStatement')}</span>
              </button>
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block mb-2">{t('exportScope')}</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
              <option value="combined">{t('combinedStatement')}</option>
              <option value="revenue">{t('revenueOnly')}</option>
              <option value="charges">{t('chargesOnly')}</option>
              <option value="receipts">{t('receiptsOnly')}</option>
            </select>
          </div>

          {/* Time Interval */}
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block mb-2">{t('timeInterval')}</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['week', 'month', 'year', 'custom'].map((p) => (
                <button key={p} type="button" onClick={() => setRange(p)} className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all ${range === p ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200'}`}>{p === 'custom' ? t('custom') : p === 'week' ? t('weekView') : p === 'month' ? t('monthView') : t('yearView')}</button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{t('startDate')}</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{t('endDate')}</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Vendor & Category filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block mb-2">{t('vendorFilter')}</label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-white">
                <option value="">{t('allVendors')}</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block mb-2">{t('categoryFilter')}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-white">
                <option value="">{t('allCategories')}</option>
                {EXPORT_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex space-x-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors">{t('cancel')}</button>
          <button type="button" onClick={handleTriggerExport} disabled={exporting} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all ${format === 'excel' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
            {exporting ? t('generating') : `${t('exportTo')} ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
