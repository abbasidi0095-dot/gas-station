import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Plus, Check, Fuel, DollarSign } from 'lucide-react';

const CHARGE_CATEGORIES = ['fuel_purchase', 'salary', 'water_electricity', 'cleaning_products', 'rent', 'maintenance', 'other'];
const REVENUE_CATEGORIES = ['fuel_sales', 'shop_sales', 'services', 'other'];

export default function PompistInput() {
  const { t, catLabel } = useLanguage();
  const [activeType, setActiveType] = useState('charges'); // 'charges' or 'revenue'
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [formVendorId, setFormVendorId] = useState('');
  const [vendors, setVendors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);

    const bodyData = {
      type: activeType === 'charges' ? 'charge' : 'revenue',
      amount: parseFloat(amount),
      category,
      date,
      description,
      vendorId: activeType === 'charges' ? formVendorId : undefined
    };

    try {
      const res = await fetch('/api/receipts/pompist/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'enregistrement.');

      setSuccessMessage('Opération soumise avec succès pour validation par l\'administrateur.');
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setFormVendorId('');
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center space-x-2">
          <Fuel className="h-7 w-7 text-indigo-600" />
          <span>Saisie d'Opération</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enregistrer une nouvelle dépense ou vente à valider par l'administration.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300 rounded-2xl flex items-center space-x-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {/* Tab Selector Buttons */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Type d'opération</label>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setActiveType('charges'); setCategory(''); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeType === 'charges'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Dépense (Charge)
            </button>
            <button
              type="button"
              onClick={() => { setActiveType('revenue'); setCategory(''); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeType === 'revenue'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Recette (Revenu)
            </button>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Montant (DH)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSuccessMessage(null); }}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => { setDate(e.target.value); setSuccessMessage(null); }}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Classification / Catégorie</label>
          {activeType === 'charges' ? (
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSuccessMessage(null); }}
              required
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Sélectionner une catégorie</option>
              {CHARGE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          ) : (
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSuccessMessage(null); }}
              required
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Sélectionner un type de revenu</option>
              {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          )}
        </div>

        {/* Vendor Mapping */}
        {activeType === 'charges' && category === 'fuel_purchase' && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Fournisseur</label>
            <select
              value={formVendorId}
              onChange={(e) => { setFormVendorId(e.target.value); setSuccessMessage(null); }}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Sélectionner un fournisseur</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Description / Remarques</label>
          <textarea
            rows="3"
            placeholder="Notes complémentaires..."
            value={description}
            onChange={(e) => { setDescription(e.target.value); setSuccessMessage(null); }}
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3.5 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
            activeType === 'charges'
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {submitting ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          <span>Soumettre l'opération</span>
        </button>
      </form>
    </div>
  );
}
