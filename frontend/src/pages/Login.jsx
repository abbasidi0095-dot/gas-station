import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage, languages } from '../context/LanguageContext.jsx';
import { Key, Mail, AlertTriangle, Eye, EyeOff, Globe } from 'lucide-react';
import { AlMohitLogo, AlMohitLogoWide } from '../components/AlMohitLogo.jsx';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const formRef = useRef(null);
  const inputsRef = useRef(null);
  const btnRef = useRef(null);
  const errorRef = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set([logoRef.current, formRef.current], { clearProps: 'all' });
    });
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(logoRef.current, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.8 })
        .fromTo(formRef.current, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.3')
        .fromTo(inputsRef.current?.children, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.07 }, '-=0.2')
        .fromTo(btnRef.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.1');
    });
    return () => mm.revert();
  }, { scope: containerRef });

  useEffect(() => {
    if (!error) return;
    gsap.fromTo(errorRef.current, { x: -6 }, { x: 0, duration: 0.25, ease: 'power2.out' });
  }, [error]);

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
      setError(err.message || t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen flex bg-slate-950 overflow-hidden">
      {/* Background grain overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-7/12 relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40" />
        <div className="absolute top-1/3 -left-24 w-96 h-96 rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-12 w-80 h-80 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div ref={logoRef} className="relative z-10 flex flex-col items-center text-center">
          <AlMohitLogo className="h-20 w-20 mb-5" variant="light" />
          <AlMohitLogoWide className="h-9 mb-3" variant="light" />
          <p className="text-sm text-slate-500 tracking-[0.25em] uppercase font-medium mt-1">
            {t('loginSubtitle')}
          </p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 lg:bg-none" />
        <div className="lg:hidden absolute top-6 left-6 z-10">
          <AlMohitLogo className="h-10 w-10" variant="light" />
        </div>
        <div className="lg:hidden absolute top-6 right-6 z-10">
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

        <div ref={formRef} className="relative z-10 w-full max-w-sm">
          <div className="rounded-2xl border border-white/[0.06] bg-[#141625]/80 backdrop-blur-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="hidden lg:flex justify-end mb-6">
              <select
                value={lang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-slate-800/60 text-white/70 text-xs rounded-lg px-3 py-1.5 border border-white/[0.06] cursor-pointer hover:text-white transition-colors"
              >
                {Object.values(languages).map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold text-white tracking-tight">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">Access the station operations portal</p>
            </div>

            {error && (
              <div ref={errorRef} className="mb-6 p-3 bg-red-950/50 border border-red-900/50 rounded-xl flex items-start space-x-2.5 text-red-200/90 text-xs">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div ref={inputsRef} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                    {t('email')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@gas.com"
                      className="w-full bg-[#0b0d14] border border-white/[0.07] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-white rounded-xl pl-10 pr-4 py-3 text-sm transition-all placeholder:text-slate-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Key className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0b0d14] border border-white/[0.07] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-white rounded-xl pl-10 pr-10 py-3 text-sm transition-all placeholder:text-slate-700"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div ref={btnRef} className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center space-x-2.5 active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t('signIn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{t('authorizedOnly')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
