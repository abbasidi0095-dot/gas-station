import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Download, Send, Merge, Trash2, FileText, CheckSquare, Square } from 'lucide-react';

function pad(n) {
  return String(n).padStart(4, '0');
}

export default function Invoices() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [sendModal, setSendModal] = useState(null);
  const [sendEmail, setSendEmail] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      if (res.ok) setInvoices(await res.json());
    } catch (err) {
      console.error('Fetch invoices error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === invoices.length) setSelected(new Set());
    else setSelected(new Set(invoices.map((i) => i.id)));
  };

  const handleMerge = async () => {
    if (selected.size < 2) return alert('Sélectionnez au moins 2 factures.');
    try {
      const res = await fetch('/api/invoices/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(new Set());
      fetchInvoices();
      alert(data.message);
    } catch (err) {
      alert(err.message || 'Erreur de fusion.');
    }
  };

  const handleSend = async (id) => {
    if (!sendEmail) return;
    try {
      const res = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSendModal(null);
      setSendEmail('');
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Erreur d\'envoi.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette facture ?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const total = invoices.reduce((s, i) => {
    const chargeTotal = i.charges?.reduce((cs, c) => cs + (c.amount || 0), 0) || 0;
    return s + chargeTotal;
  }, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gérez vos factures — téléchargement, envoi, fusion.</p>
        </div>
        {selected.size >= 2 && (
          <button onClick={handleMerge} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">
            <Merge className="h-4 w-4" />
            <span>Fusionner ({selected.size})</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">{t('loading')}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune facture.</div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                        {selected.size === invoices.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">N° Facture</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Type</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Montant</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Statut</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {invoices.map((inv) => {
                    const chargeTotal = inv.charges?.reduce((s, c) => s + (c.amount || 0), 0) || 0;
                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${inv.status === 'merged_into' ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelect(inv.id)} disabled={inv.status === 'merged_into'} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                            {selected.has(inv.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">INV-{pad(inv.invoiceNumber)}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            inv.type === 'consolidated'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {inv.type === 'consolidated' ? 'Consolidée' : 'Simple'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                          {chargeTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            inv.status === 'generated' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            inv.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {inv.status === 'generated' ? 'Générée' : inv.status === 'sent' ? 'Envoyée' : 'Fusionnée'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1">
                            <a href={`/api/invoices/${inv.id}/download`}
                              className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Télécharger">
                              <Download className="h-4 w-4" />
                            </a>
                            <button onClick={() => { setSendModal(inv.id); setSendEmail(''); }}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 rounded transition-colors" title="Envoyer par email">
                              <Send className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(inv.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 rounded transition-colors" title="Supprimer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            Total factures : <strong>{invoices.length}</strong> &mdash; Montant total : <strong>{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</strong>
          </div>
        </>
      )}

      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-lg mb-4">Envoyer la facture</h3>
            <input
              type="email"
              placeholder="Email du destinataire"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm mb-4 bg-white dark:bg-slate-700"
            />
            <div className="flex space-x-3">
              <button onClick={() => setSendModal(null)} className="flex-1 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Annuler</button>
              <button onClick={() => handleSend(sendModal)} disabled={!sendEmail} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
