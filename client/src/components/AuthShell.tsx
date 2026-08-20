import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { LogoMark } from './Logo';

const perks = [
  'Real-time kanban boards your team actually enjoys using',
  'AI assistant that plans, summarizes and flags delivery risks',
  'Milestones, voice chat and weekly reports — built in',
];

const stats = [
  { v: '2.4×', l: 'faster delivery' },
  { v: '1.2k+', l: 'teams onboard' },
  { v: '4.8★', l: 'user rating' },
];

export function AuthShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-slate-100 p-4 sm:p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl animate-float" />
      <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-orange-400/20 blur-3xl animate-float [animation-delay:3s]" />

      <div className="animate-pop-in relative w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-teal-700/10 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[1fr_1.05fr]">
          <aside className="animate-gradient relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-orange-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
            <div className="absolute -right-16 bottom-24 h-64 w-64 rounded-full bg-white/10 blur-2xl animate-float [animation-delay:3s]" />
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '18px 18px' }} />

            <Link to="/" className="relative flex items-center gap-2.5" aria-label="Nexora home">
              <LogoMark className="h-10 w-10" />
              <span className="text-2xl font-extrabold tracking-tight text-white">Nexora</span>
            </Link>

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
                <Sparkles size={13} /> The project workspace that thinks ahead
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                Plan, track and ship — with AI by your side
              </h1>
              <ul className="mt-7 space-y-3">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-white/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative grid grid-cols-3 gap-4">
              {stats.map((s) => (
                <div key={s.l}>
                  <p className="text-xl font-extrabold">{s.v}</p>
                  <p className="text-xs text-white/75">{s.l}</p>
                </div>
              ))}
            </div>
          </aside>

          <div className="relative flex flex-col p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-2" aria-label="Nexora home">
                <LogoMark className="h-8 w-8" />
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nexora</span>
              </Link>
              <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-slate-400 lg:inline-flex dark:text-slate-500">
                <ShieldCheck size={14} className="text-teal-600 dark:text-teal-400" /> Secure by default
              </span>
            </div>

            <div className="flex max-w-md flex-col justify-center self-center py-6">
              <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <Zap size={14} /> {title}
              </div>
              {subtitle && <p className="-mt-4 mb-6 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}