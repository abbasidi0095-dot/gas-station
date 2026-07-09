import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage, languages } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { LayoutDashboard, DollarSign, Users, ClipboardCheck, LogOut, Menu, X, Globe, ChevronDown, Receipt, Sun, Moon } from 'lucide-react';
import { AlMohitLogo, AlMohitLogoWide } from './AlMohitLogo.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t, lang, changeLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [soldGasCount, setSoldGasCount] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

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
    </div>
  );
}
