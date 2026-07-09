import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Eye } from 'lucide-react';

const STATUS_TABS = ['', 'pending_review', 'confirmed', 'rejected'];

export default function ReceiptHistory() {
  const { t } = useLanguage();
  const [receipts, setReceipts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/receipts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Fetch receipts error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('receiptHistory')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('receiptHistoryDesc')}</p>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {s ? t(s) : t('allStatuses')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">{t('loading')}</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">{t('noReceipts')}</div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Image</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('vendor')}</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('amount')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('date')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('type')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('status')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <img
                          src={r.imageUrl}
                          alt="receipt"
                          className="h-12 w-16 object-cover rounded border border-slate-200 dark:border-slate-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.vendor?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">
                        {r.amount != null ? r.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH' : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.date || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          r.purpose === 'expense'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {t(r.purpose === 'expense' ? 'expenseType' : 'revenueType')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          r.status === 'pending_review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {t(r.status === 'pending_review' ? 'pending' : r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/receipts/${r.id}`}
                          className="inline-flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Détail</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">{total} reçu(s)</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  ←
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-500">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
