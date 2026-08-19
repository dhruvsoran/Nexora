import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { usePageMeta, SITE_URL, DEFAULT_OG_IMAGE } from '../lib/seo';
import {
  ArrowRight,
  Sparkles,
  KanbanSquare,
  MessageSquare,
  Mic,
  CalendarRange,
  ShieldCheck,
  Bot,
  Check,
  Rocket,
  Ship,
  Github,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { Reveal } from '../components/Reveal';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

const features = [
  {
    icon: KanbanSquare,
    title: 'Visual kanban boards',
    desc: 'Drag-and-drop tasks across columns with live multi-user sync, priorities, story points and labels.',
  },
  {
    icon: Bot,
    title: 'AI project assistant',
    desc: 'Generate tasks from a prompt, auto-prioritize, estimate effort and detect delivery risks with Gemini.',
  },
  {
    icon: CalendarRange,
    title: 'Milestones & timeline',
    desc: 'Group work into milestones, track progress and plan with a shared calendar of tasks and releases.',
  },
  {
    icon: MessageSquare,
    title: 'Team chat & @mentions',
    desc: 'Channels and DMs built right in. Comment on tasks and mention teammates to notify them instantly.',
  },
  {
    icon: Mic,
    title: 'Talk to your project',
    desc: 'Voice conversation with Nexora AI — ask what changed this week, hands-free, from anywhere.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles, plans & audit',
    desc: 'Owner/admin/member roles, subscription tiers, and an audit trail with admin controls for orgs.',
  },
];

const steps = [
  { n: '01', icon: Rocket, title: 'Create a workspace', desc: 'Name your team, pick a key, and invite your people in seconds.' },
  { n: '02', icon: KanbanSquare, title: 'Plan with boards & milestones', desc: 'Set up columns, generate tasks with AI, and group them into milestones.' },
  { n: '03', icon: Ship, title: 'Ship & stay in sync', desc: 'Move cards, log time, chat, and get weekly AI reports on progress.' },
];

const plans = [
  { id: 'free', name: 'Free', price: 0, desc: 'For individuals & side projects', features: ['2 boards', '5 members', 'Kanban & basic tasks', 'Community support'] },
  { id: 'pro', name: 'Pro', price: 9, desc: 'For growing teams', features: ['Unlimited boards', '25 members', 'Milestones, dependencies & time', 'AI assistant & calendar view'] },
  { id: 'business', name: 'Business', price: 19, desc: 'For organizations', features: ['Unlimited boards & members', 'Weekly AI reports & risk detection', 'Audit trail & admin controls', 'Priority support'] },
];

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const authed = Boolean(user);

  const appSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Nexora',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Plan, track and ship with kanban boards, milestones, team chat, time tracking and a voice-enabled AI assistant in one workspace.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1284' },
      featureList: 'Kanban boards, milestones, AI assistant, team chat, voice notes, time tracking, video meetings',
    }),
    []
  );

  usePageMeta({
    title: 'Nexora — AI Project Management & Team Collaboration',
    description:
      'Plan, track and ship with Nexora — kanban boards, milestones, team chat, time tracking and a voice-enabled AI assistant in one fast workspace. Start free.',
    path: '/',
    image: DEFAULT_OG_IMAGE,
    schema: appSchema,
  });

  return (
    <div className="min-h-full overflow-x-hidden dark:bg-transparent">
      <Nav authed={authed} />
      <Hero authed={authed} />
      <StatsStrip />
      <Features />
      <HowItWorks />
      <Pricing authed={authed} />
      <Cta authed={authed} />
      <Footer />
    </div>
  );
}

function Nav({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Logo to="/" />
          <nav className="hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Features
            </a>
            <a
              href="#how"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Pricing
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {authed ? (
            <Link to="/workspaces" className="group inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-800/30 transition hover:bg-teal-800 active:bg-teal-900">
              Open Nexora <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:block dark:text-slate-200 dark:hover:bg-slate-800">
                Log in
              </Link>
              <Link to="/register" className="group inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-800/30 transition hover:bg-teal-800 active:bg-teal-900">
                Get started <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-orange-400/30 blur-3xl animate-float" />
      <div className="absolute top-24 -right-24 h-96 w-96 rounded-full bg-orange-400/30 blur-3xl animate-float [animation-delay:2s]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl animate-float [animation-delay:4s]" />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="max-w-xl">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300">
              <Sparkles size={13} /> Plan. Track. Ship. — with AI by your side
            </div>

            <h1 className="animate-fade-up mt-6 text-4xl font-extrabold tracking-tight text-slate-900 [animation-delay:120ms] sm:text-5xl lg:text-6xl dark:text-white">
              The project workspace
              <span className="animate-gradient block bg-gradient-to-r from-teal-600 via-teal-500 to-orange-400 bg-clip-text text-transparent">
                that thinks ahead
              </span>
            </h1>

            <p className="animate-fade-up mt-5 text-base text-slate-600 [animation-delay:240ms] sm:text-lg dark:text-slate-300">
              Nexora brings kanban boards, milestones, team chat, and a voice-enabled AI assistant
              into one fast workspace — so your team can plan less and ship more.
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3 [animation-delay:360ms]">
              <Button
                className="group px-6 py-3 text-base shadow-xl shadow-teal-800/30"
                onClick={() => navigateTo(authed)}
              >
                {authed ? 'Go to your workspace' : 'Start for free'}
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:480ms]">
            <HeroBoard />
          </div>
        </div>
      </div>
    </section>
  );
}

function navigateTo(authed: boolean) {
  if (authed) {
    window.location.href = '/workspaces';
  } else {
    window.location.href = '/register';
  }
}

function HeroBoard() {
  const cols = [
    { name: 'Backlog', color: '#64748b', tasks: [{ t: 'Design onboarding flow', tag: 'design', pts: 5, done: false }, { t: 'Wire up AI reporter', tag: 'ai', pts: 3, done: false }] },
    { name: 'In progress', color: '#f97316', tasks: [{ t: 'Dark mode toggle', tag: 'frontend', pts: 2, done: true }, { t: 'Milestone panel', tag: 'feature', pts: 8, done: false }] },
    { name: 'Done', color: '#0d9488', tasks: [{ t: 'Landing page', tag: 'marketing', pts: 3, done: true }, { t: 'Weekly AI report', tag: 'ai', pts: 5, done: true }] },
  ];
  return (
    <div className="relative mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-2xl shadow-teal-700/10 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
        <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">Nexora · Launch Squad</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cols.map((col, ci) => (
          <div key={col.name} className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{col.name}</span>
            </div>
            {col.tasks.map((task) => (
              <div
                key={task.t}
                className="mb-2 rounded-lg border border-slate-100 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                style={{ animationDelay: `${400 + ci * 200 + col.tasks.indexOf(task) * 150}ms` }}
              >
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{task.t}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {task.tag}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{task.pts} pts</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsStrip() {
  const stats = [
    { v: '2.4×', l: 'faster delivery' },
    { v: '1.2k+', l: 'teams onboard' },
    { v: '99.9%', l: 'uptime' },
    { v: '4.8★', l: 'user rating' },
  ];
  return (
    <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.l} delay={i * 100} className="text-center">
            <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">{s.v}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.l}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">Everything your team needs</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          One workspace, no context switching
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Boards, milestones, chat, voice AI and reports — purpose-built to work together.
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 120}>
            <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-orange-300 hover:shadow-xl hover:shadow-teal-700/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-600">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-teal-600 to-orange-500 p-3 text-white shadow-lg shadow-teal-800/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <f.icon size={20} />
              </div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            From idea to shipped in three steps
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            No setup marathon — set up, plan, and start shipping in minutes.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <div
            className="absolute top-[60px] right-[16.7%] left-[16.7%] hidden border-t-2 border-dashed border-orange-300/70 md:block dark:border-orange-700/50"
            aria-hidden="true"
          />

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 150}>
                <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-orange-300 hover:shadow-xl hover:shadow-teal-700/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-600">
                  <span className="absolute top-3 right-3 rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                    STEP {s.n}
                  </span>

                  <div className="relative mx-auto mb-6 h-14 w-14">
                    <span className="animate-gradient flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-teal-500 to-orange-400 font-extrabold text-white shadow-lg shadow-teal-800/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                      {s.n}
                    </span>
                    <span className="absolute -right-2 -bottom-2 flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:border-orange-700 dark:bg-slate-900 dark:text-orange-300">
                      <s.icon size={14} />
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ authed }: { authed: boolean }) {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">Pricing</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Start free, upgrade when you grow
        </h2>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((p, i) => (
          <Reveal key={p.id} delay={i * 130}>
            <div
              className={cn(
                'relative flex h-full flex-col rounded-2xl border bg-white p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:bg-slate-900',
                p.id === 'pro'
                  ? 'border-orange-400 shadow-lg shadow-teal-700/10 dark:border-orange-600'
                  : 'border-slate-200 dark:border-slate-800'
              )}
            >
              {p.id === 'pro' && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-600 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow">
                  MOST POPULAR
                </span>
              )}
              <h3 className="font-semibold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.desc}</p>
              <p className="mt-4 text-4xl font-extrabold text-slate-900 dark:text-white">
                ${p.price}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/mo</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={15} className="shrink-0 text-orange-500" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={authed ? '/workspaces' : '/register'}
                className={cn(
                  'mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition',
                  p.id === 'pro'
                    ? 'bg-teal-700 text-white shadow-lg shadow-teal-800/30 hover:bg-teal-800 active:bg-teal-900'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800'
                )}
              >
                {authed ? 'Open in Nexora' : `Get ${p.name}`}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Cta({ authed }: { authed: boolean }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <Reveal>
        <div className="animate-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-orange-500 px-6 py-16 text-center text-white shadow-2xl shadow-teal-800/30 sm:px-12">
          <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl animate-float" />
          <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-2xl animate-float [animation-delay:3s]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to plan smarter with AI?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-orange-100">
              Join teams who stopped juggling tools and started shipping with Nexora.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={authed ? '/workspaces' : '/register'}
                className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-orange-700 shadow-xl transition hover:bg-orange-50 active:bg-orange-100"
              >
                {authed ? 'Go to your workspace' : 'Start for free'}
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!authed && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 active:bg-white/20"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <span onClick={scrollTop} className="inline-block cursor-pointer">
              <Logo to="/" />
            </span>
            <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              The project workspace that thinks ahead. Built for fast-moving teams.
            </p>
          </div>
          <div className="flex gap-3">
            <Social href="#" label="GitHub"><Github size={17} /></Social>
            <Social href="#" label="Twitter"><Twitter size={17} /></Social>
            <Social href="#" label="LinkedIn"><Linkedin size={17} /></Social>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:text-slate-400 sm:flex-row dark:border-slate-800">
          <p>© {new Date().getFullYear()} Nexora · Founded by Dhruv Soran. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="transition hover:text-slate-600 dark:hover:text-slate-200">Privacy</a>
            <a href="#" className="transition hover:text-slate-600 dark:hover:text-slate-200">Terms</a>
            <a href="#" className="transition hover:text-slate-600 dark:hover:text-slate-200">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
    >
      {children}
    </a>
  );
}
