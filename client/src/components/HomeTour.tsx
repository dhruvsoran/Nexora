import { useEffect, useRef, useState } from 'react';
import {
  Rocket,
  FolderKanban,
  PlusCircle,
  KanbanSquare,
  Flag,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Step {
  icon: typeof Rocket;
  title: string;
  desc: string;
  accent: string;
  target?: string;
  badge: string;
}

const steps: Step[] = [
  {
    icon: Rocket,
    title: 'Welcome to Nexora',
    desc: 'Everything your team ships lives here — boards, plans, chat and AI. This 1-minute tour shows you around.',
    accent: 'from-teal-600 to-orange-500',
    badge: 'Start here',
  },
  {
    icon: FolderKanban,
    title: 'Your workspaces',
    desc: 'Each workspace is a home for one team or project. Open one to find its boards, members and chats.',
    accent: 'from-teal-600 to-teal-400',
    target: '.tour-workspace-card',
    badge: 'Home',
  },
  {
    icon: PlusCircle,
    title: 'Create more anytime',
    desc: 'Spin up a new workspace in seconds with a name and a short key — invite teammates right from the sidebar.',
    accent: 'from-orange-500 to-orange-400',
    target: '.tour-new-workspace',
    badge: 'Home',
  },
  {
    icon: KanbanSquare,
    title: 'Boards, not todos',
    desc: 'Open any board to get a kanban with drag-and-drop cards, priorities, labels, story points, due dates and assignees.',
    accent: 'from-teal-600 to-teal-400',
    badge: 'Inside a workspace',
  },
  {
    icon: Flag,
    title: 'Milestones & plans',
    desc: 'Group tasks into milestones, watch progress bars fill up, and read weekly AI reports on delivery health.',
    accent: 'from-orange-500 to-orange-400',
    badge: 'Inside a workspace',
  },
  {
    icon: MessageSquare,
    title: 'Chat & mentions',
    desc: 'Talk in channels, comment on tasks, @mention teammates to notify them, and attach voice notes.',
    accent: 'from-teal-600 to-teal-400',
    badge: 'Inside a workspace',
  },
  {
    icon: Sparkles,
    title: 'AI & voice',
    desc: 'Tap the mic to talk to Nexora AI, generate tasks from a prompt, get board summaries and spot risks early.',
    accent: 'from-teal-600 via-teal-500 to-orange-400',
    badge: 'The good part',
  },
];

const TOUR_KEY = 'nexora-tour-seen';

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch {
    return false;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    /* ignore */
  }
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function HomeTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [wide, setWide] = useState(false);
  const resizeRef = useRef<number | null>(null);

  const step = steps[index];

  useEffect(() => {
    const update = () => setWide(window.innerWidth >= 1024);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    setBox(null);
    if (!open || !step.target || !wide) return;
    let target = document.querySelector<HTMLElement>(step.target);
    if (!target) return;

    const measure = () => {
      const r = target!.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();

    const onResize = () => {
      if (resizeRef.current) window.clearTimeout(resizeRef.current);
      resizeRef.current = window.setTimeout(measure, 120);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    const ro = new ResizeObserver(measure);
    ro.observe(target);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      ro.disconnect();
      if (resizeRef.current) window.clearTimeout(resizeRef.current);
    };
  }, [open, index, step.target, wide]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const atEnd = index === steps.length - 1;

  function close() {
    markTourSeen();
    onClose();
  }

  function next() {
    if (atEnd) close();
    else setIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="animate-fade-in absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={close} />

      {box && (
        <div
          key={index}
          className="animate-pop-in pointer-events-none absolute z-[101]"
          style={{ top: box.top - 8, left: box.left - 8, width: box.width + 16, height: box.height + 16 }}
        >
          <div className="relative h-full w-full rounded-2xl border-[3px] border-teal-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]" />
          <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 animate-ping rounded-full border border-teal-200 bg-teal-400" />
          <span
            className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full border-2 border-teal-300 bg-orange-500"
            style={{ animation: 'float 2.5s ease-in-out infinite' }}
          />
        </div>
      )}

      <div
        className={cn(
          'absolute right-0 left-0 z-[102] mx-auto w-[calc(100%-2rem)] max-w-md',
          box ? 'bottom-5 sm:bottom-8' : 'top-1/2 -translate-y-1/2'
        )}
      >
        <div className="animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative flex items-start gap-4 p-5 pb-4">
            <div
              className={cn(
                'animate-gradient inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg',
                step.accent
              )}
            >
              <Icon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-wide text-orange-600 uppercase dark:text-orange-300">{step.badge}</p>
              <h3 className="mt-0.5 font-semibold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.desc}</p>
            </div>
            <button
              onClick={close}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Skip tour"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 px-5 pb-4">
            <button
              onClick={prev}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} /> Back
            </button>

            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setIndex(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index ? 'w-5 bg-teal-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700'
                  )}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 active:bg-teal-900"
            >
              {atEnd ? 'Got it' : 'Next'}
              {!atEnd && <ChevronRight size={14} />}
            </button>
          </div>

          <p className="border-t border-slate-100 px-5 py-2 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {index + 1} of {steps.length} · press Esc to skip
          </p>
        </div>
      </div>
    </div>
  );
}