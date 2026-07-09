import { cn } from '@/lib/utils';

export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-lg text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50';
  const variants = {
    default: 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 shadow-sm',
    outline: 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  };
  const sizes = {
    default: 'h-8 px-3 gap-1.5',
    sm: 'h-7 px-2.5 gap-1 text-xs',
    lg: 'h-9 px-4 gap-2',
    icon: 'h-8 w-8',
    'icon-sm': 'h-7 w-7',
  };
  return (
    <button
      className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.default, className)}
      {...props}
    />
  );
}
