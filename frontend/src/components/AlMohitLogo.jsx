function useLogoSrc() {
  return `/assets/logo.png`;
}

export function AlMohitLogo({ className = 'h-9 w-9', variant = 'light' }) {
  return (
    <img
      src={useLogoSrc()}
      alt="Al Mohit"
      className={`${className} rounded-lg object-contain ${variant === 'light' ? 'bg-slate-900' : 'bg-slate-100'}`}
    />
  );
}

export function AlMohitLogoWide({ className = 'h-7' }) {
  return (
    <img
      src={useLogoSrc()}
      alt="Al Mohit"
      className={`${className} object-contain`}
    />
  );
}
