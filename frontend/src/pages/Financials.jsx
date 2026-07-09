import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DollarSign, Landmark, Plus, Trash2, Edit3, X, Filter, RefreshCw, FileOutput } from 'lucide-react';
import ExportModal from '../components/ExportModal.jsx';

const CHARGE_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];
const REVENUE_CATEGORIES = ['fuel_sales', 'shop_sales', 'services', 'other'];

export default function Financials() {
  const { t, catLabel } = useLanguage();
  const [activeTab, setActiveTab] = useState('charges');
  const [vendors, setVendors] = useState([]);
  const [charges, setCharges] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  const [vendorFilter, setVendorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [formVendorId, setFormVendorId] = useState('');

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const vendorRes = await fetch('/api/financials/vendors');
      if (vendorRes.ok) setVendors(await vendorRes.json());

      const chargesParams = new URLSearchParams();
      if (vendorFilter) chargesParams.append('vendorId', vendorFilter);
      if (activeTab === 'charges' && categoryFilter) chargesParams.append('category', categoryFilter);
      if (startDate) chargesParams.append('startDate', startDate);
      if (endDate) chargesParams.append('endDate', endDate);

      const chargesRes = await fetch(`/api/financials/charges?${chargesParams.toString()}`);
      if (chargesRes.ok) setCharges(await chargesRes.json());

      const revParams = new URLSearchParams();
      if (activeTab === 'revenue' && categoryFilter) revParams.append('category', categoryFilter);
      if (startDate) revParams.append('startDate', startDate);
      if (endDate) revParams.append('endDate', endDate);

      const revRes = await fetch(`/api/financials/revenue?${revParams.toString()}`);
      if (revRes.ok) setRevenue(await revRes.json());
    } catch (err) {
      console.error('Failed to sync financial tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinancialData(); }, [activeTab, vendorFilter, categoryFilter, startDate, endDate]);

  const handleClearFilters = () => {
    setVendorFilter(''); setCategoryFilter(''); setStartDate(''); setEndDate('');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const endpoint = activeTab === 'charges' ? '/api/financials/charges' : '/api/financials/revenue';
    const method = editingItem ? 'PUT' : 'POST';
    const finalUrl = editingItem ? `${endpoint}/${editingItem.id}` : endpoint;

    const bodyData = { amount, category, date, description, vendorId: activeTab === 'charges' ? formVendorId : undefined };

    try {
      const res = await fetch(finalUrl, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalOpen(false); setEditingItem(null);
      setAmount(''); setCategory(''); setDate(''); setDescription(''); setFormVendorId('');
      fetchFinancialData();
    } catch (err) {
      alert(err.message || 'Failed to record entry.');
    }
  };

  const handleLaunchEdit = (item) => {
    setEditingItem(item);
    setAmount(item.amount); setCategory(item.category); setDate(item.date.split('T')[0]);
    setDescription(item.description || '');
    if (activeTab === 'charges') setFormVendorId(item.vendorId || '');
    setModalOpen(true);
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    const endpoint = activeTab === 'charges' ? `/api/financials/charges/${id}` : `/api/financials/revenue/${id}`;
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) fetchFinancialData();
    } catch (err) { console.error(err); }
  };

  const ledgerSum = activeTab === 'charges'
    ? charges.reduce((sum, item) => sum + (item.amount || 0), 0)
    : revenue.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('financialLedger')}</h2>
          <p className="text-sm text-slate-500">{t('financialsDesc')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExportOpen(true)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 bg-white text-slate-700 font-bold text-xs rounded-xl shadow-sm flex items-center space-x-2 transition-all"
          >
            <FileOutput className="h-4 w-4" />
            <span>{t('exportData')}</span>
          </button>
          <button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === 'charges' ? t('addCharge') : t('logRevenue')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('charges'); handleClearFilters(); }}
          className={`flex items-center space-x-2.5 px-6 py-3 font-bold text-sm tracking-tight border-b-2 transition-all ${activeTab === 'charges' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <DollarSign className="h-4 w-4" />
          <span>{t('tabCharges')}</span>
        </button>
        <button
          onClick={() => { setActiveTab('revenue'); handleClearFilters(); }}
          className={`flex items-center space-x-2.5 px-6 py-3 font-bold text-sm tracking-tight border-b-2 transition-all ${activeTab === 'revenue' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Landmark className="h-4 w-4" />
          <span>{t('tabRevenue')}</span>
        </button>
      </div>

      {/* Sum Box */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner border border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('ledgerTotal')}</span>
          <span className="text-sm text-slate-400 mt-1">{t('ledgerTotalDesc')}</span>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-black ${activeTab === 'charges' ? 'text-red-400' : 'text-emerald-400'}`}>
            {ledgerSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold">MAD / DH</span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('searchFilters')}</h4>
          </div>
          <button onClick={handleClearFilters} className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">{t('clearAll')}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-medium">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('category')}</span>
            {activeTab === 'charges' ? (
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
                <option value="">{t('allCategories')}</option>
                {CHARGE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            ) : (
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
                <option value="">{t('allSources')}</option>
                {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            )}
          </div>

          {activeTab === 'charges' && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('fuelVendor')}</span>
              <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
                <option value="">{t('allSuppliers')}</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('startDate')}</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('endDate')}</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700" />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="w-full py-12 flex justify-center items-center space-x-2">
          <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-500">{t('retrieving')}</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3">{t('date')}</th>
                {activeTab === 'charges' && <th className="px-5 py-3">{t('supplierVendor')}</th>}
                <th className="px-5 py-3">{t('category')}</th>
                <th className="px-5 py-3">{t('description')}</th>
                <th className="px-5 py-3">{t('flowType')}</th>
                <th className="px-5 py-3 text-right">{t('amount')}</th>
                <th className="px-5 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {activeTab === 'charges' ? (
                charges.length === 0 ? (
                  <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">{t('noCharges')}</td></tr>
                ) : (
                  charges.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{item.vendor ? item.vendor.name : <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-3.5">{catLabel(item.category)}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate" title={item.description}>{item.description || '—'}</td>
                      <td className="px-5 py-3.5">
                        {item.receiptId ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">{t('ocrScan')}</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{t('manual')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-red-600">-{(item.amount || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <button onClick={() => handleLaunchEdit(item)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-all inline-block"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteEntry(item.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all inline-block"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                revenue.length === 0 ? (
                  <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">{t('noRevenue')}</td></tr>
                ) : (
                  revenue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">{catLabel(item.category)}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate" title={item.description}>{item.description || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">{t('salesInflow')}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600">+{(item.amount || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <button onClick={() => handleLaunchEdit(item)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-all inline-block"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteEntry(item.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all inline-block"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form onSubmit={handleSubmitForm} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-md">{editingItem ? t('editEntry') : activeTab === 'charges' ? t('recordCharge') : t('logRevenueStream')}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('valueAmount')}</label>
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('transactionDate')}</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('categoryClassification')}</label>
                {activeTab === 'charges' ? (
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                    <option value="">{t('selectCategory')}</option>
                    {CHARGE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                ) : (
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                    <option value="">{t('selectStream')}</option>
                    {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                )}
              </div>
              {activeTab === 'charges' && category === 'fuel_purchase' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('supplierMapping')}</label>
                  <select value={formVendorId} onChange={(e) => setFormVendorId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800">
                    <option value="">{t('chooseSupplier')}</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('notesRemarks')}</label>
                <textarea rows="3" placeholder={t('notesPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex space-x-3">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 text-slate-500 hover:text-slate-700 text-sm font-semibold">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-md">{t('confirmEntry')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Export Modal */}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          filters={{
            vendorId: vendorFilter || null,
            category: (activeTab === 'charges' ? categoryFilter : null) || null,
            startDate: startDate || null,
            endDate: endDate || null,
            scope: activeTab === 'charges' ? 'charges' : 'revenue',
          }}
        />
      )}
    </div>
  );
}
