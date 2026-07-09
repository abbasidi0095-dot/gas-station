export function AlMohitLogo({ className = 'h-8 w-8', variant = 'light' }) {
  const fill = variant === 'light' ? '#fff' : '#1e293b';
  const accent = variant === 'light' ? '#818cf8' : '#4f46e5';
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="40" height="40" rx="10" fill={variant === 'light' ? '#4f46e5' : '#e2e8f0'} />
      <path d="M20 8C17.5 8 14 10.5 14 15v3h-1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V20a2 2 0 0 0-2-2h-1v-3c0-4.5-3.5-7-6-7z" fill={fill} opacity="0.9" />
      <path d="M20 8c1 0 2.5.8 3.5 2.5C24.5 12.2 25 14.5 25 17v1h-1v-1c0-2-.3-3.5-1-4.5S21.5 10 20 10s-1.7.5-2.5 1.5C16.8 12.5 16 14 16 17v1h-1v-1c0-2.5.5-4.8 1.5-6.5C17.5 8.8 19 8 20 8z" fill={accent} />
      <path d="M18 22a2 2 0 0 1 4 0v4a2 2 0 0 1-4 0v-4z" fill={accent} />
      <path d="M19 22.5h2v3h-2z" fill={fill} opacity="0.5" />
    </svg>
  );
}

export function AlMohitLogoWide({ className = 'h-7', variant = 'light' }) {
  const fill = variant === 'light' ? '#fff' : '#1e293b';
  return (
    <svg viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="0" y="2" width="24" height="24" rx="6" fill={variant === 'light' ? '#4f46e5' : '#cbd5e1'} />
      <path d="M12 4c-1.5 0-3.6 1.5-3.6 4.2v1.8H9a1.2 1.2 0 0 0-1.2 1.2v6a1.2 1.2 0 0 0 1.2 1.2h6a1.2 1.2 0 0 0 1.2-1.2v-6a1.2 1.2 0 0 0-1.2-1.2h-.6V8.2c0-2.7-2.1-4.2-3.6-4.2z" fill={fill} opacity="0.9" />
      <path d="M12 4c.6 0 1.5.48 2.1 1.5.6 1.02.9 2.4.9 3.9v.6h-.6v-.6c0-1.2-.18-2.1-.6-2.7s-.9-.9-1.5-.9-1.02.3-1.5.9c-.48.6-.6 1.5-.6 2.7v.6h-.6v-.6c0-1.5.3-2.88.9-3.9C10.5 4.48 11.4 4 12 4z" fill={variant === 'light' ? '#a5b4fc' : '#6366f1'} />
      <text x="32" y="20" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="16" letterSpacing="-0.02em" fill={fill}>AL MOHIT</text>
      <text x="32" y="26" fontFamily="system-ui, sans-serif" fontWeight="500" fontSize="7" letterSpacing="0.2em" fill={variant === 'light' ? '#a5b4fc' : '#64748b'}>GAS STATION</text>
    </svg>
  );
}
