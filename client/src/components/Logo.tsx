import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('h-9 w-9', className)}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="nexora-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="55%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <polygon
        points="24,3 42.2,13.5 42.2,34.5 24,45 5.8,34.5 5.8,13.5"
        fill="url(#nexora-mark)"
      />
      <polygon
        points="24,8.5 37.5,16.4 37.5,31.6 24,39.5 10.5,31.6 10.5,16.4"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <path
        d="M15 32.5 V15.5 L32 32.5 V15.5"
        fill="none"
        stroke="#fff"
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="37.8" cy="9.6" r="3.3" fill="#fff7ed" />
      <path
        d="M40.3 4.6 a4.4 4.4 0 0 1 2.2 4.3"
        fill="none"
        stroke="#fdba74"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M45.4 3.6 l1.3 0.7 -1.3 0.7 -0.7 1.3 -0.7 -1.3 -1.3 -0.7 1.3 -0.7 0.7 -1.3 z"
        fill="#ffedd5"
      />
    </svg>
  );
}

export function Logo({ size = 'md', to = '/', className }: { size?: 'sm' | 'md' | 'lg'; to?: string; className?: string }) {
  const mark = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const word = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Nexora home">
      <LogoMark
        className={cn(
          'drop-shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6',
          mark
        )}
      />
      <span className={cn('font-extrabold tracking-tight text-slate-900 dark:text-white', word)}>
        Nexora
      </span>
    </Link>
  );
}
