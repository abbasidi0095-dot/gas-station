import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Users, Wallet, Plus, Trash2, Edit2, X, BadgeCheck, DollarSign } from 'lucide-react';

export default function Workers() {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingWorker, setPayingWorker] = useState({});

  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const [name, setName] = useState('');
  const [cin, setCin] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [wemail, setWemail] = useState('');
  const [hireDate, setHireDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([fetch('/api/workers'), fetch('/api/workers/payments')]);
      if (wRes.ok) setWorkers(await wRes.json());
      if (pRes.ok) setPayments(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleScanComplete = () => {
      fetchData();
    };
    window.addEventListener('scan-complete', handleScanComplete);
    return () => window.removeEventListener('scan-complete', handleScanComplete);
  }, []);

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    try {
      const url = editingWorker ? `/api/workers/${editingWorker.id}` : '/api/workers';
      const method = editingWorker ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, cin, position, phone, email: wemail || null, hireDate, active: editingWorker ? editingWorker.active : true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkerModalOpen(false); setEditingWorker(null);
      setName(''); setCin(''); setPosition(''); setPhone(''); setWemail(''); setHireDate('');
      fetchData();
    } catch (err) { alert(err.message || 'Error saving worker.'); }
  };

  const handleToggleStatus = async (worker) => {
    try {
      const res = await fetch(`/api/workers/${worker.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...worker, active: !worker.active }) });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const launchEditWorker = (w) => {
    setEditingWorker(w);
    setName(w.name); setCin(w.cin); setPosition(w.position); setPhone(w.phone); setWemail(w.email || '');
    setHireDate(w.hireDate.split('T')[0]);
    setWorkerModalOpen(true);
  };

  const handlePaid = async (workerId) => {
    const pw = payingWorker[workerId];
    if (!pw || !pw.amount || !pw.from || !pw.to) {
      alert('Veuillez remplir le montant et les dates.');
      return;
    }
    try {
      const res = await fetch('/api/workers/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          amount: parseFloat(pw.amount),
          date: pw.to,
          periodStart: pw.from,
          periodEnd: pw.to,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayingWorker(prev => ({ ...prev, [workerId]: {} }));
      fetchData();
    } catch (err) { alert(err.message || 'Erreur de paiement.'); }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm(t('deletePaymentConfirm'))) return;
    try {
      const res = await fetch(`/api/workers/payments/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const positionOptions = [
    { value: 'Pump Attendant', label: t('pumpAttendant') },
    { value: 'Cashier', label: t('cashier') },
    { value: 'Technician', label: t('technician') },
  ];

  const today = () => new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{t('staffPayroll')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('staffDesc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setEditingWorker(null); setWorkerModalOpen(true); }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all">
            <Plus className="h-4 w-4" /><span>{t('addStaff')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full py-12 flex justify-center"><div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-50">{t('roster')} ({workers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-3 py-3">{t('name')}</th>
                      <th className="px-3 py-3">{t('cin')}</th>
                      <th className="px-3 py-3">{t('position')}</th>
                      <th className="px-3 py-3">{t('phone')}</th>
                      <th className="px-3 py-3">{t('status')}</th>
                      <th className="px-3 py-3 text-center" colSpan="4">Paiement</th>
                      <th className="px-3 py-3 text-right">{t('actions')}</th>
                    </tr>
                    <tr className="text-[9px] text-slate-400">
                      <th colSpan="5" />
                      <th className="px-2 py-1 font-semibold">Montant</th>
                      <th className="px-2 py-1 font-semibold">Du</th>
                      <th className="px-2 py-1 font-semibold">Au</th>
                      <th className="px-2 py-1 font-semibold" />
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 dark:text-slate-300">
                    {workers.filter(w => w.active).map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-50 text-xs whitespace-nowrap">{w.name}</td>
                        <td className="px-3 py-2 text-xs"><span className="inline-flex items-center space-x-1 text-slate-600 dark:text-slate-400"><BadgeCheck className="h-3 w-3 text-indigo-400" />{w.cin}</span></td>
                        <td className="px-3 py-2 text-xs">{w.position === 'Pump Attendant' ? t('pumpAttendant') : w.position === 'Cashier' ? t('cashier') : w.position === 'Technician' ? t('technician') : w.position}</td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{w.phone}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleToggleStatus(w)} className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${w.active ? 'bg-emerald-100 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            {w.active ? t('active') : t('inactive')}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.01" min="0" placeholder="0.00"
                            value={payingWorker[w.id]?.amount || ''}
                            onChange={(e) => setPayingWorker(prev => ({ ...prev, [w.id]: { ...prev[w.id], amount: e.target.value } }))}
                            className="w-20 border rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="date" max={today()}
                            value={payingWorker[w.id]?.from || ''}
                            onChange={(e) => setPayingWorker(prev => ({ ...prev, [w.id]: { ...prev[w.id], from: e.target.value } }))}
                            className="w-28 border rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="date" max={today()}
                            value={payingWorker[w.id]?.to || ''}
                            onChange={(e) => setPayingWorker(prev => ({ ...prev, [w.id]: { ...prev[w.id], to: e.target.value } }))}
                            className="w-28 border rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600" />
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => handlePaid(w.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center space-x-1 transition-all">
                            <DollarSign className="h-3 w-3" /><span>Payé</span>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => launchEditWorker(w)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center space-x-3"><Wallet className="h-5 w-5 text-slate-900 dark:text-slate-50" /><h3 className="font-bold text-slate-900 dark:text-slate-50">{t('payroll')} ({payments.length})</h3></div>
                <span className="text-xs font-bold text-emerald-600">{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} MAD / DH</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">{t('noPayments')}</div>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="p-4 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-50">{p.worker?.name}</h4>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(p.date).toLocaleDateString()} &bull; {(p.amount || 0).toFixed(2)} MAD / DH</p>
                        {p.description && <p className="text-xs text-slate-400 italic">"{p.description}"</p>}
                      </div>
                      <button onClick={() => handleDeletePayment(p.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {workerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form onSubmit={handleSaveWorker} className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 text-md">{editingWorker ? t('modifyStaff') : t('registerStaff')}</h3>
              <button type="button" onClick={() => setWorkerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('fullName')}</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('cinLabel')}</label>
                  <input type="text" required placeholder="AB123456" value={cin} onChange={(e) => setCin(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('position')}</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                    <option value="">{t('selectPosition')}</option>
                    {positionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('phone')}</label>
                  <input type="text" required placeholder="+212..." value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('hireDate')}</label>
                  <input type="date" required value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email (fiche de paie)</label>
                <input type="email" placeholder="employe@email.com" value={wemail} onChange={(e) => setWemail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex space-x-3">
              <button type="button" onClick={() => setWorkerModalOpen(false)} className="flex-1 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-md">{t('save')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}