import { HTMLAttributes, PropsWithChildren } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
  primary:
    'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 disabled:bg-teal-300 disabled:text-orange-50 dark:disabled:bg-teal-500/50 dark:disabled:text-orange-100',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-600',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

interface ButtonProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  type = 'button',
  disabled,
  loading,
  className = '',
  children,
  ...rest
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition select-none focus:outline-none focus:ring-2 focus:ring-teal-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}