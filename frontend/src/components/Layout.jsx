import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage, languages } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { LayoutDashboard, DollarSign, Users, ClipboardCheck, LogOut, Menu, X, Globe, ChevronDown, Receipt, Sun, Moon, Image, FileText, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { AlMohitLogo, AlMohitLogoWide } from './AlMohitLogo.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t, lang, changeLanguage, catLabel } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [soldGasCount, setSoldGasCount] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickMessage, setQuickMessage] = useState(null);
  const [quickContext, setQuickContext] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    const handleOpen = () => {
      handleResetQuickAdd();
      setQuickPanelOpen(true);
    };
    window.addEventListener('open-quick-add', handleOpen);
    return () => window.removeEventListener('open-quick-add', handleOpen);
  }, []);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickText.trim()) return;

    const userMsg = quickText;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setQuickLoading(true);
    setQuickText('');
    setQuickMessage(null);

    try {
      const res = await fetch('/api/financials/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMsg, context: quickContext }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erreur lors du traitement par l\'IA.');

      if (resData.status === 'incomplete') {
        setQuickContext(resData.context);
        setChatHistory(prev => [...prev, {
          sender: 'ai',
          text: resData.prompt,
          partial: resData.context.partialTransaction
        }]);
      } else {
        setQuickContext(null);
        setChatHistory(prev => [...prev, { sender: 'ai', text: resData.message, isComplete: true }]);
        setQuickMessage({ type: 'success', text: resData.message });
        window.dispatchEvent(new CustomEvent('scan-complete'));
      }
    } catch (err) {
      console.error(err);
      setQuickMessage({ type: 'error', text: err.message });
      setChatHistory(prev => [...prev, { sender: 'ai', text: `Erreur: ${err.message}`, isError: true }]);
    } finally {
      setQuickLoading(false);
    }
  };

  const handleResetQuickAdd = () => {
    setQuickText('');
    setQuickContext(null);
    setChatHistory([]);
    setQuickMessage(null);
  };

  useEffect(() => {
    if (!user) return;

    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/receipts/queue');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.length);
        }
        const sgRes = await fetch('/api/receipts/sold-gas/queue');
        if (sgRes.ok) {
          const sgData = await sgRes.json();
          setSoldGasCount(sgData.length);
        }
      } catch (err) {
        console.error('Failed to poll queue:', err);
      }
    }

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('soldGas'), path: '/sold-gas', icon: Receipt, badge: soldGasCount },
    { name: t('financials'), path: '/financials', icon: DollarSign },
    { name: t('staff'), path: '/workers', icon: Users },
    { name: t('reviewQueue'), path: '/review-queue', icon: ClipboardCheck, badge: pendingCount },
    { name: t('receipts'), path: '/receipts', icon: Image },
    { name: 'Factures', path: '/invoices', icon: FileText },
    { name: t('settings'), path: '/settings', icon: SettingsIcon },
  ];

  const LangSwitcher = () => (
    <div className="relative" ref={langRef}>
      <button
        onClick={() => setLangOpen(!langOpen)}
        className="flex items-center space-x-1.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span>{languages[lang].label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {langOpen && (
        <div className="absolute bottom-full mb-1 left-2 right-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
          {Object.values(languages).map((l) => (
            <button
              key={l.code}
              onClick={() => { changeLanguage(l.code); setLangOpen(false); }}
              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm transition-colors ${
                lang === l.code ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-6 text-center font-bold text-xs">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-4">
      <div className="hidden md:flex items-center space-x-3 px-2 py-4 border-b border-slate-800">
        <AlMohitLogo className="h-9 w-9 shrink-0" variant="light" />
        <div className="min-w-0">
          <AlMohitLogoWide className="h-6" variant="light" />
        </div>
      </div>

      <nav className="flex-1 mt-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              {item.badge > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800 flex flex-col space-y-3">
        <LangSwitcher />
        <div className="flex items-center space-x-3 px-2">
          <div className="h-9 w-9 bg-slate-700 rounded-full flex items-center justify-center font-bold text-indigo-400">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{user?.name}</h4>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{user?.role}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <AlMohitLogo className="h-7 w-7" variant="light" />
          <span className="font-bold tracking-tight text-sm">Al Mohit</span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-slate-800 text-white text-xs rounded-md px-2 py-1 border border-slate-700"
          >
            {Object.values(languages).map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 rounded-md hover:bg-slate-800 focus:outline-none">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden bg-slate-950/50 backdrop-blur-sm">
          <div className="w-64 max-w-xs h-full relative z-50">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-20">
        {sidebarContent}
      </aside>

      <main className="flex-1 md:pl-64 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>

      {user && (
        <>
          {/* Floating Saisie Rapide (IA) Button */}
          <button
            onClick={() => { handleResetQuickAdd(); setQuickPanelOpen(true); }}
            className="fixed bottom-6 right-6 z-40 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-3.5 rounded-full shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all group"
            title="Saisie Rapide IA"
          >
            <Sparkles className="h-5 w-5 text-indigo-200 group-hover:animate-pulse" />
            <span className="hidden sm:inline-block pr-1">Saisie Rapide IA</span>
          </button>

          {/* Saisie Rapide IA Conversational Assistant Drawer Overlay */}
          {quickPanelOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm transition-all duration-300">
              <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Drawer Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/45">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 text-sm leading-none">Assistant Saisie Rapide (IA)</h3>
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                        En ligne · Prêt
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={handleResetQuickAdd} className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg transition-colors" title="Réinitialiser la transaction">
                      Réinitialiser
                    </button>
                    <button type="button" onClick={() => setQuickPanelOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Conversational Feed */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  
                  {/* Default Welcome Message */}
                  {chatHistory.length === 0 && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                          Bonjour Mr Salami. Écrivez n'importe quelle opération en langage naturel, et je m'occupe de l'analyser et de l'enregistrer dans les comptes !
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Si vous oubliez le montant, le fournisseur ou la date, pas d'inquiétude, je vous demanderai de me préciser les détails manquants un par un !
                        </p>
                      </div>

                      {/* Suggestions list */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Exemples de saisie :</span>
                        {[
                          "Vente Gasoil Al Mohit 12500 DH hier",
                          "Achat carburant Afriquia 60000 DH",
                          "Salaire Hassan 2500 DH",
                          "Facture eau et électricité Lydec",
                          "Achat produits de nettoyage 800 DH"
                        ].map((example) => (
                          <button
                            key={example}
                            onClick={() => setQuickText(example)}
                            className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-xs text-slate-600 dark:text-slate-400 font-semibold transition-all hover:border-indigo-200/50"
                          >
                            ⚡ "{example}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat turns */}
                  {chatHistory.map((turn, i) => (
                    <div key={i} className={`flex flex-col ${turn.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}>
                      <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-medium leading-relaxed shadow-sm ${
                        turn.sender === 'user'
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-955 rounded-br-none'
                          : turn.isComplete
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 rounded-bl-none'
                          : turn.isError
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-bl-none'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-955 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50 rounded-bl-none'
                      }`}>
                        {turn.text}
                      </div>

                      {/* If turn is AI and has partially extracted transaction, display it beautifully! */}
                      {turn.partial && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/35 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] w-full max-w-[80%] space-y-1">
                          <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Informations Extraites :</span>
                          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 font-bold">
                            <div>Type: <span className="text-indigo-600 dark:text-indigo-400 capitalize">{turn.partial.type || 'Inconnu'}</span></div>
                            <div>Montant: <span className="text-slate-900 dark:text-slate-50 font-black">{turn.partial.amount ? `${turn.partial.amount.toFixed(2)} DH` : 'Manquant ❌'}</span></div>
                            <div>Catégorie: <span className="text-slate-900 dark:text-slate-50 capitalize">{turn.partial.category ? catLabel(turn.partial.category) : 'Manquant ❌'}</span></div>
                            <div>Date: <span className="text-slate-900 dark:text-slate-50">{turn.partial.date || 'Manquante ❌'}</span></div>
                            <div className="col-span-2">Fournisseur/Employé: <span className="text-slate-900 dark:text-slate-50">{turn.partial.workerName || turn.partial.vendor || 'Manquant ❌'}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loader */}
                  {quickLoading && (
                    <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-505">
                      <div className="h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold animate-pulse">L'IA réfléchit...</span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/45">
                  <form onSubmit={handleQuickAdd} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      disabled={quickLoading}
                      placeholder={
                        quickContext 
                          ? "Répondez à la question de l'IA..." 
                          : "Saisissez l'opération ici..."
                      }
                      className="flex-1 px-4 py-2.5 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={quickLoading || !quickText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center space-x-1 transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Envoyer</span>
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
