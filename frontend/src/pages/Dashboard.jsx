import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Landmark, Sparkles, FileOutput, Calendar, RefreshCcw, AlertOctagon, Building2, Receipt
} from 'lucide-react';
import ReceiptScanner from '../components/ReceiptScanner.jsx';
import ExportModal from '../components/ExportModal.jsx';

const CHARGE_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];

export default function Dashboard() {
  const { t, catLabel } = useLanguage();
  const navigate = useNavigate();
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentTx, setRecentTx] = useState([]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/summary?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard summaries.');
      const summaryData = await res.json();
      setData(summaryData);

      const reviewRes = await fetch('/api/receipts/queue');
      if (reviewRes.ok) setPendingCount((await reviewRes.json()).length);

      const chargesRes = await fetch('/api/financials/charges');
      if (chargesRes.ok) {
        const allCharges = await chargesRes.json();
        setRecentTx(allCharges.slice(0, 8));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred fetching dashboard aggregates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [range]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('execDashboard')}</h2>
          <p className="text-sm text-slate-500">{t('dashboardDesc')}</p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button onClick={() => setScannerOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center space-x-2 transition-all">
            <Sparkles className="h-4 w-4" /><span>{t('smartScan')}</span>
          </button>
          <button onClick={() => setExportOpen(true)} className="px-4 py-2 border border-slate-300 hover:bg-slate-100 bg-white text-slate-700 font-bold text-sm rounded-xl shadow-sm flex items-center space-x-2 transition-all">
            <FileOutput className="h-4 w-4" /><span>{t('exportData')}</span>
          </button>
        </div>
      </div>

      {/* Review banner */}
      {pendingCount > 0 && (
        <div onClick={() => navigate('/review-queue')} className="p-4 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-900 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 animate-bounce"><AlertOctagon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-bold text-slate-900">{t('reviewRequired')}</p>
              <p className="text-xs text-slate-600">{t('reviewRequiredDesc', { n: pendingCount })}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 underline">{t('resolveQueue')}</span>
        </div>
      )}

      {/* Range controls */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-1">
          {[
            { label: t('weekView'), val: 'week' },
            { label: t('monthView'), val: 'month' },
            { label: t('yearView'), val: 'year' }
          ].map((item) => (
            <button key={item.val} onClick={() => setRange(item.val)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === item.val ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <button onClick={fetchDashboardData} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors" title={t('refresh')}>
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="w-full h-80 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500">{t('aggregating')}</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-2xl text-center max-w-md mx-auto">
          <p className="text-red-800 font-bold mb-2">{t('failedDashboard')}</p>
          <p className="text-xs text-red-600 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg text-xs">{t('retryConnection')}</button>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('totalRevenue')}</span>
                <h3 className="text-3xl font-black text-slate-900">{data.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">MAD</span></h3>
                <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><TrendingUp className="h-3 w-3 mr-1" /><span>{t('receiptsSales')}</span></span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUp className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('totalSpend')}</span>
                <h3 className="text-3xl font-black text-slate-900">{data.summary.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">MAD</span></h3>
                <span className="inline-flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded"><TrendingDown className="h-3 w-3 mr-1" /><span>{t('chargesLogistics')}</span></span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-red-600"><TrendingDown className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('netProfit')}</span>
                <h3 className={`text-3xl font-black ${data.summary.netProfit >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{data.summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">MAD</span></h3>
                <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded ${data.summary.netProfit >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}><Landmark className="h-3 w-3 mr-1" /><span>{data.summary.netProfit >= 0 ? t('surplus') : t('deficit')}</span></span>
              </div>
              <div className={`p-3 rounded-xl ${data.summary.netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}><Landmark className="h-6 w-6" /></div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-md">{t('trendTitle')}</h4>
              <p className="text-xs text-slate-400">{t('trendDesc')}</p>
            </div>
            <div className="h-80 w-full text-xs">
              {data.chartsData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 font-medium">{t('noHistory')}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }} labelStyle={{ fontWeight: 'bold', color: '#6366f1' }} />
                    <Legend iconType="circle" />
                    <Bar name={t('totalRevenue')} dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name={t('totalSpend')} dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Vendor Breakdown + Pie charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vendor breakdown card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center space-x-2 mb-1">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-md">{t('vendorBreakdown')}</h4>
              </div>
              <p className="text-xs text-slate-400 mb-4">{t('vendorBreakdownDesc')}</p>
              <div className="flex-1 space-y-3">
                {(!data.vendorBreakdown || data.vendorBreakdown.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm">{t('noExpenseData')}</div>
                ) : (
                  data.vendorBreakdown.map((item, index) => {
                    const total = data.vendorBreakdown.reduce((s, i) => s + i.value, 0) || 1;
                    const pct = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700">{item.name}</span>
                          <span className="font-bold text-slate-900">{item.value.toLocaleString(undefined, { minimumFractionDigits: 0 })} MAD</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{pct}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Revenue pie */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div><h4 className="font-bold text-slate-900 text-md">{t('revenueDist')}</h4><p className="text-xs text-slate-400">{t('revenueDistDesc')}</p></div>
              <div className="h-64 w-full flex-1 mt-4">
                {data.revenueCategories.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">{t('noRevenueData')}</div>
                ) : (
                  <div className="h-full flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="h-44 w-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={data.revenueCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">{data.revenueCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 text-xs">
                      {data.revenueCategories.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between font-medium">
                          <div className="flex items-center space-x-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-600 capitalize">{catLabel(item.name)}</span></div>
                          <span className="font-bold text-slate-800">{item.value.toLocaleString()} MAD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expense pie */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div><h4 className="font-bold text-slate-900 text-md">{t('expenseDist')}</h4><p className="text-xs text-slate-400">{t('expenseDistDesc')}</p></div>
              <div className="h-64 w-full flex-1 mt-4">
                {data.expenseCategories.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">{t('noExpenseData')}</div>
                ) : (
                  <div className="h-full flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="h-44 w-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={data.expenseCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">{data.expenseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 text-xs">
                      {data.expenseCategories.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between font-medium">
                          <div className="flex items-center space-x-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-600">{catLabel(item.name)}</span></div>
                          <span className="font-bold text-slate-800">{item.value.toLocaleString()} MAD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center space-x-3 bg-slate-50">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <div>
                <h4 className="font-bold text-slate-900">{t('recentTransactions')}</h4>
                <p className="text-xs text-slate-400">{t('recentTransactionsDesc')}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{t('date')}</th>
                    <th className="px-5 py-3">{t('supplierVendor')}</th>
                    <th className="px-5 py-3">{t('category')}</th>
                    <th className="px-5 py-3 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentTx.length === 0 ? (
                    <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400">{t('noCharges')}</td></tr>
                  ) : (
                    recentTx.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-bold text-slate-900">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{item.vendor ? item.vendor.name : <span className="text-slate-400">—</span>}</td>
                        <td className="px-5 py-3">{catLabel(item.category)}</td>
                        <td className="px-5 py-3 text-right font-bold text-red-600">-{(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {scannerOpen && <ReceiptScanner onClose={() => setScannerOpen(false)} onScanComplete={fetchDashboardData} />}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          filters={{ vendorId: null, category: null, startDate: null, endDate: null, scope: 'combined' }}
        />
      )}
    </div>
  );
}
