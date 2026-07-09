import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ArrowLeft, Building2, Calendar, DollarSign, BadgeCheck, FileText, ScanLine } from 'lucide-react';

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/receipts/${id}`);
        if (res.ok) setReceipt(await res.json());
      } catch (err) {
        console.error('Fetch receipt detail error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="text-center py-16 text-slate-400">{t('loading')}</div>;
  }

  if (!receipt) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">{t('noReceipts')}</p>
        <button onClick={() => navigate('/receipts')} className="text-indigo-600 hover:underline mt-2 inline-block">
          {t('backToHistory')}
        </button>
      </div>
    );
  }

  const linked = receipt.charge || receipt.revenue;

  return (
    <div>
      <button
        onClick={() => navigate('/receipts')}
        className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('backToHistory')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center min-h-[300px]">
            <img
              src={receipt.imageUrl}
              alt="Receipt"
              className="max-w-full max-h-[500px] object-contain rounded"
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-lg font-bold mb-4">{t('receiptDetail')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center space-x-1.5">
                  <Building2 className="h-4 w-4" />
                  <span>{t('vendor')}</span>
                </span>
                <span className="text-sm font-medium">{receipt.vendor?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center space-x-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span>{t('amount')}</span>
                </span>
                <span className="text-sm font-mono font-bold">
                  {receipt.amount != null ? receipt.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH' : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center space-x-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{t('date')}</span>
                </span>
                <span className="text-sm font-medium">{receipt.date || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center space-x-1.5">
                  <FileText className="h-4 w-4" />
                  <span>{t('type')}</span>
                </span>
                <span className="text-sm font-medium">
                  {t(receipt.purpose === 'expense' ? 'expenseType' : 'revenueType')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center space-x-1.5">
                  <BadgeCheck className="h-4 w-4" />
                  <span>{t('status')}</span>
                </span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  receipt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  receipt.status === 'pending_review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {t(receipt.status === 'pending_review' ? 'pending' : receipt.status)}
                </span>
              </div>
              {receipt.confidenceScore != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center space-x-1.5">
                    <ScanLine className="h-4 w-4" />
                    <span>{t('confidence')}</span>
                  </span>
                  <span className="text-sm font-medium">
                    {(receipt.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {linked && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">{t('linkedEntry')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('amount')}</span>
                  <span className="font-mono font-bold">
                    {linked.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('category')}</span>
                  <span className="font-medium">{linked.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('type')}</span>
                  <span className="font-medium">
                    {t(receipt.charge ? 'linkedCharge' : 'linkedRevenue')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {receipt.extractedRawText && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('ocrText')}</h3>
              <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded max-h-48 overflow-y-auto">
                {receipt.extractedRawText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
