import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Landmark, Sparkles, FileOutput, Calendar, RefreshCcw, AlertOctagon, Building2, Receipt,
  Percent, Award, Lightbulb, Coins, Plus, X
} from 'lucide-react';
import ReceiptScanner from '../components/ReceiptScanner.jsx';
import ExportModal from '../components/ExportModal.jsx';

const CHARGE_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];
const REVENUE_CATEGORIES = ['fuel_sales', 'shop_sales', 'services', 'other'];

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

  // New state variables for direct manual entry from Home Page (Dashboard)
  const [modalOpen, setModalOpen] = useState(false);
  const [activeType, setActiveType] = useState('charges'); // 'charges' or 'revenue'
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [formVendorId, setFormVendorId] = useState('');
  const [vendors, setVendors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await fetch('/api/financials/vendors');
        if (res.ok) setVendors(await res.json());
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      }
    }
    fetchVendors();
  }, []);

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const endpoint = activeType === 'charges' ? '/api/financials/charges' : '/api/financials/revenue';
    const bodyData = {
      amount: parseFloat(amount),
      category,
      date: new Date(date),
      description,
      vendorId: activeType === 'charges' ? formVendorId : undefined
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to record entry.');
      setModalOpen(false);
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setFormVendorId('');
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to record entry.');
    } finally {
      setSubmitting(false);
    }
  };

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

  useEffect(() => {
    const handleScanComplete = () => {
      fetchDashboardData();
    };
    window.addEventListener('scan-complete', handleScanComplete);
    return () => window.removeEventListener('scan-complete', handleScanComplete);
  }, [range]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{t('execDashboard')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardDesc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setActiveType('charges'); setCategory(''); setModalOpen(true); }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all">
            <Plus className="h-4 w-4" /><span>Ajouter Opération</span>
          </button>
          <button onClick={() => setScannerOpen(true)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all">
            <Sparkles className="h-4 w-4" /><span>{t('smartScan')}</span>
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-quick-add'))} className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all">
            <Sparkles className="h-4 w-4 text-indigo-400" /><span>Saisie Rapide IA</span>
          </button>
          <button onClick={() => setExportOpen(true)} className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl shadow-sm dark:shadow-slate-900/50 flex items-center space-x-2 transition-all">
            <FileOutput className="h-4 w-4" /><span>{t('exportData')}</span>
          </button>
        </div>
      </div>

      {/* Review banner */}
      {pendingCount > 0 && (
        <div onClick={() => navigate('/review-queue')} className="p-4 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-700 dark:text-amber-400 animate-bounce"><AlertOctagon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{t('reviewRequired')}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('reviewRequiredDesc', { n: pendingCount })}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline">{t('resolveQueue')}</span>
        </div>
      )}

      {/* Range controls */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 p-3 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center space-x-1">
          {[
            { label: t('weekView'), val: 'week' },
            { label: t('monthView'), val: 'month' },
            { label: t('yearView'), val: 'year' }
          ].map((item) => (
            <button key={item.val} onClick={() => setRange(item.val)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === item.val ? 'bg-slate-900 text-white shadow-sm dark:shadow-slate-900/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <button onClick={fetchDashboardData} className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-600 transition-colors" title={t('refresh')}>
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="w-full h-80 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('aggregating')}</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-center max-w-md mx-auto">
          <p className="text-red-800 dark:text-red-300 font-bold mb-2">{t('failedDashboard')}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg text-xs">{t('retryConnection')}</button>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{t('totalRevenue')}</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50">{data.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">MAD / DH</span></h3>
                <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded"><TrendingUp className="h-3 w-3 mr-1" /><span>{t('receiptsSales')}</span></span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-6 w-6" /></div>
            </div>
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{t('totalSpend')}</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50">{data.summary.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">MAD / DH</span></h3>
                <span className="inline-flex items-center text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded"><TrendingDown className="h-3 w-3 mr-1" /><span>{t('chargesLogistics')}</span></span>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400"><TrendingDown className="h-6 w-6" /></div>
            </div>
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{t('netProfit')}</span>
                <h3 className={`text-3xl font-black ${data.summary.netProfit >= 0 ? 'text-slate-900 dark:text-slate-50' : 'text-red-700'}`}>{data.summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">MAD / DH</span></h3>
                <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded ${data.summary.netProfit >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}><Landmark className="h-3 w-3 mr-1" /><span>{data.summary.netProfit >= 0 ? t('surplus') : t('deficit')}</span></span>
              </div>
              <div className={`p-3 rounded-xl ${data.summary.netProfit >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}><Landmark className="h-6 w-6" /></div>
            </div>
          </div>

          {/* Smart Insights Cards (Innovation & Improvement) */}
          {(() => {
            const numDays = range === 'week' ? 7 : range === 'year' ? 365 : 30;
            const avgDailyRev = data.summary.totalRevenue / numDays;
            const opMargin = data.summary.totalRevenue > 0 ? (data.summary.netProfit / data.summary.totalRevenue) * 100 : 0;
            const maxExpense = data.expenseCategories.reduce((max, c) => c.value > max.value ? c : max, { name: '—', value: 0 });
            const totalExp = data.summary.totalCharges || 1;
            const expPct = ((maxExpense.value / totalExp) * 100).toFixed(0);

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Metric 1: Operating Margin */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marge d'Exploitation</span>
                    <Percent className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-indigo-300">{opMargin.toFixed(1)}%</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {opMargin > 15 
                        ? 'Excellente rentabilité opérationnelle ce mois.' 
                        : opMargin > 0 
                        ? 'Rentabilité opérationnelle dans la moyenne saine.' 
                        : 'Marge déficitaire. Attention aux frais fixes.'}
                    </p>
                  </div>
                </div>

                {/* Metric 2: Average Daily Revenue */}
                <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenu Journalier Moyen</span>
                    <Coins className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-slate-50">{avgDailyRev.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-semibold text-slate-400">DH/jour</span></h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sur la base d'une période d'analyse de {numDays} jours.</p>
                  </div>
                </div>

                {/* Metric 3: Primary Cost Driver */}
                <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Poste Principal de Frais</span>
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-slate-50 capitalize">{maxExpense.name === 'salary' ? 'Salaires' : catLabel(maxExpense.name)}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Représente {expPct}% de vos charges d'exploitation totales.</p>
                  </div>
                </div>

                {/* Metric 4: AI Smart Tip */}
                <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Conseil d'Optimisation</span>
                    <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-950 dark:text-indigo-200 font-semibold leading-relaxed">
                      {maxExpense.name === 'salary' 
                        ? 'Optimisez les horaires d\'équipe du personnel pour réduire les coûts salariaux marginaux.' 
                        : maxExpense.name === 'fuel_purchase' 
                        ? 'Négociez des remises sur volume auprès de vos fournisseurs de carburant.' 
                        : 'Vérifiez la facturation de vos frais généraux de la station.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Trend Chart */}
          <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-50 text-md">{t('trendTitle')}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('trendDesc')}</p>
            </div>
            <div className="h-80 w-full text-xs">
              {data.chartsData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">{t('noHistory')}</div>
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
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 flex flex-col">
              <div className="flex items-center space-x-2 mb-1">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 dark:text-slate-50 text-md">{t('vendorBreakdown')}</h4>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{t('vendorBreakdownDesc')}</p>
              <div className="flex-1 space-y-3">
                {(!data.vendorBreakdown || data.vendorBreakdown.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium text-sm">{t('noExpenseData')}</div>
                ) : (
                  data.vendorBreakdown.map((item, index) => {
                    const total = data.vendorBreakdown.reduce((s, i) => s + i.value, 0) || 1;
                    const pct = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-50">{item.value.toLocaleString(undefined, { minimumFractionDigits: 0 })} MAD / DH</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{pct}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Revenue pie */}
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 flex flex-col">
              <div><h4 className="font-bold text-slate-900 dark:text-slate-50 text-md">{t('revenueDist')}</h4><p className="text-xs text-slate-400 dark:text-slate-500">{t('revenueDistDesc')}</p></div>
              <div className="h-64 w-full flex-1 mt-4">
                {data.revenueCategories.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">{t('noRevenueData')}</div>
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
                          <div className="flex items-center space-x-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-600 dark:text-slate-400 capitalize">{catLabel(item.name)}</span></div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.value.toLocaleString()} MAD / DH</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expense pie */}
            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 flex flex-col">
              <div><h4 className="font-bold text-slate-900 dark:text-slate-50 text-md">{t('expenseDist')}</h4><p className="text-xs text-slate-400 dark:text-slate-500">{t('expenseDistDesc')}</p></div>
              <div className="h-64 w-full flex-1 mt-4">
                {data.expenseCategories.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">{t('noExpenseData')}</div>
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
                          <div className="flex items-center space-x-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-600 dark:text-slate-400">{catLabel(item.name)}</span></div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.value.toLocaleString()} MAD / DH</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/50 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-50">{t('recentTransactions')}</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t('recentTransactionsDesc')}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{t('date')}</th>
                    <th className="px-5 py-3">{t('supplierVendor')}</th>
                    <th className="px-5 py-3">{t('category')}</th>
                    <th className="px-5 py-3 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 dark:text-slate-300">
                  {recentTx.length === 0 ? (
                    <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">{t('noCharges')}</td></tr>
                  ) : (
                    recentTx.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-50">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.vendor ? item.vendor.name : <span className="text-slate-400 dark:text-slate-500">—</span>}</td>
                        <td className="px-5 py-3">{catLabel(item.category)}</td>
                        <td className="px-5 py-3 text-right font-bold text-red-600 dark:text-red-400">-{(item.amount || 0).toFixed(2)}</td>
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

      {/* Dynamic Smooth Manual Entry Modal for adding charge or revenue */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all duration-300">
          <form onSubmit={handleSubmitForm} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/45">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-50 text-md">Ajouter une opération</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Enregistrer une dépense ou un revenu manuellement</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Selector Buttons */}
            <div className="px-6 pt-4">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setActiveType('charges'); setCategory(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeType === 'charges'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Dépense (Charge)
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveType('revenue'); setCategory(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeType === 'revenue'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Recette (Revenu)
                </button>
              </div>
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Classification / Catégorie</label>
                {activeType === 'charges' ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {CHARGE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Sélectionner un type de revenu</option>
                    {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                )}
              </div>

              {activeType === 'charges' && category === 'fuel_purchase' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Fournisseur</label>
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Notes facultatives sur l'opération..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/45 border-t border-slate-100 dark:border-slate-800 flex space-x-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-sm font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
                  activeType === 'charges'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submitting ? (
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
