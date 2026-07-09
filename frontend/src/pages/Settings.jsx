import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Mail, Send, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export default function Settings() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('disabled');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('almohit_report_email');
    if (saved) setEmail(saved);
    fetch('/api/settings').then(r => r.ok && r.json()).then(data => {
      if (data?.report_frequency) setFrequency(data.report_frequency);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    localStorage.setItem('almohit_report_email', email);
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'report_frequency', value: frequency }),
    });
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'report_email', value: email }),
    });
    setMessage({ type: 'success', text: t('emailSaved') });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSendReport = async () => {
    if (!email) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reports/daily', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) setMessage({ type: 'success', text: t('reportSent') });
      else setMessage({ type: 'error', text: data.error || t('reportFailed') });
    } catch (err) {
      setMessage({ type: 'error', text: t('reportFailed') });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('settingsTitle')}</h1>
      </div>

      <div className="space-y-6">
        {/* Report Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold">{t('dailyReport')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('reportDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('reportEmail')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fréquence</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors">
                  <option value="disabled">Manuel uniquement</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire (lundi)</option>
                  <option value="monthly">Mensuel (1er du mois)</option>
                  <option value="annual">Annuel (1er janvier)</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={handleSave}
                className="px-4 py-2 text-sm font-medium rounded-lg border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                {t('save')}
              </button>
              <button onClick={handleSendReport} disabled={sending || !email}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                <Send className="h-4 w-4" />
                <span>{sending ? t('reportSending') : t('sendReport')}</span>
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`flex items-center space-x-2 text-sm p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
