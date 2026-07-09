import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage, languages } from '../context/LanguageContext.jsx';
import { Key, Mail, AlertTriangle, Eye, EyeOff, Globe } from 'lucide-react';
import { AlMohitLogo, AlMohitLogoWide } from '../components/AlMohitLogo.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('fillCredentials'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="absolute top-4 right-4 z-20">
        <select
          value={lang}
          onChange={(e) => changeLanguage(e.target.value)}
          className="bg-slate-800/80 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 backdrop-blur-md cursor-pointer"
        >
          {Object.values(languages).map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      <div className="max-w-md w-full bg-slate-950/40 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col">
        <div className="flex flex-col items-center text-center mb-8">
          <AlMohitLogo className="h-14 w-14 mb-3" variant="light" />
          <AlMohitLogoWide className="h-7" variant="light" />
          <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-widest font-semibold">{t('loginSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/50 border border-red-800 rounded-xl flex items-start space-x-3 text-red-200 text-xs">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1.5">{t('email')}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gas.com"
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1.5">{t('password')}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Key className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm transition-all placeholder:text-slate-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center space-x-2.5"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{t('signIn')}</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{t('authorizedOnly')}</p>
        </div>
      </div>
    </div>
  );
}
