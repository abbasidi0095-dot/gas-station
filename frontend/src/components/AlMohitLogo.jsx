export function AlMohitLogo({ className = 'h-9 w-9', variant = 'light' }) {
  const c1 = variant === 'light' ? '#d97706' : '#f59e0b';
  const c2 = variant === 'light' ? '#047857' : '#10b981';
  const c3 = variant === 'light' ? '#1e40af' : '#3b82f6';
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="w1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id="w2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
        <linearGradient id="w3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c3} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={variant === 'light' ? '#0f172a' : '#f1f5f9'} />
      <path d="M6 14 C14 8 18 18 26 10" stroke="url(#w1)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M6 20 C14 14 18 24 28 16" stroke="url(#w2)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M6 26 C14 20 18 30 30 22" stroke="url(#w3)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
    </svg>
  );
}

export function AlMohitLogoWide({ className = 'h-7', variant = 'light' }) {
  const c1 = variant === 'light' ? '#d97706' : '#f59e0b';
  const c2 = variant === 'light' ? '#047857' : '#10b981';
  const c3 = variant === 'light' ? '#d97706' : '#f59e0b';
  const fill = variant === 'light' ? '#f1f5f9' : '#0f172a';
  const sub = variant === 'light' ? '#94a3b8' : '#64748b';
  return (
    <svg viewBox="0 0 130 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ww" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect x="0" y="2" width="24" height="24" rx="6" fill={variant === 'light' ? '#0f172a' : '#e2e8f0'} />
      <path d="M4 10 C7 7 9 13 12 9" stroke="url(#ww)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M4 13.5 C7 10.5 9 16.5 13 12.5" stroke="url(#ww)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M4 17 C7 14 9 20 14 16" stroke="url(#ww)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      <text x="32" y="16" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="14" letterSpacing="0.04em" fill={fill}>AL MOHIT</text>
      <text x="32" y="24" fontFamily="system-ui, sans-serif" fontWeight="500" fontSize="6.5" letterSpacing="0.3em" fill={sub}>GAS STATION</text>
    </svg>
  );
}
