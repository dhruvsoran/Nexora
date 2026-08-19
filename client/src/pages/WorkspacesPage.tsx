import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, FolderKanban, ArrowUpRight, Compass, KanbanSquare } from 'lucide-react';
import { getWorkspaces, createWorkspace } from '../api/workspaces';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { HomeTour, tourSeen } from '../components/HomeTour';
import { PlanBadge } from '../components/ui/PlanBadge';
import { UserMenu } from '../components/layout/UserMenu';
import { LogoPicker } from '../components/workspace/LogoPicker';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { usePageMeta } from '../lib/seo';
import { cn } from '../lib/utils';
import { WorkspaceSummary } from '../api/types';

const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' };

export function WorkspacesPage() {
  usePageMeta({
    title: 'Your workspaces — Nexora',
    description: 'Pick a workspace or create a new one to plan, track and ship with your team.',
    path: '/workspaces',
  });
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const workspaces = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces });

  const create = useMutation({
    mutationFn: (input: { name: string; key: string; logo: string }) => createWorkspace(input),
    onSuccess: async () => {
      toast.success('Workspace created');
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const firstName = user?.name?.split(/\s+/)[0] ?? 'there';

  const list = workspaces.data ?? [];
  const totalBoards = list.reduce((acc, ws) => acc + ws.boardCount, 0);
  const topRole = list.reduce((acc, ws) => {
    const rank = { owner: 3, admin: 2, member: 1 }[ws.role] ?? 0;
    return rank > (acc.rank ?? 0) ? { label: ws.role, rank } : acc;
  }, { label: 'member' as string, rank: 0 });

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo to="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-gradient relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-orange-500 p-6 text-white shadow-xl shadow-teal-800/20 sm:p-8">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl animate-float" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/10 blur-2xl animate-float [animation-delay:3s]" />

          <div className="relative grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {firstName}</h1>
              <p className="mt-2 max-w-md text-sm text-teal-50/90 sm:text-base">
                Pick a workspace to keep shipping — or start something new.
                {!tourSeen() && (
                  <span className="mt-1.5 block">
                    New around here? Take the tour below to discover boards, milestones, chat and the AI assistant.
                  </span>
                )}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setTourOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 active:bg-white/30"
                >
                  <Compass size={16} /> {tourSeen() ? 'Replay the tour' : 'Take the 1-min tour'}
                </button>
                <button
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-teal-800 shadow-lg transition hover:bg-orange-50 active:bg-orange-100"
                >
                  <Plus size={16} /> New workspace
                </button>
              </div>
            </div>

            {list.length > 0 && (
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <HeroStat value={String(list.length)} label="Workspaces" />
                <HeroStat value={String(totalBoards)} label="Boards" />
                <HeroStat value={roleLabel[topRole.label] ?? 'Member'} label="Your role" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <FolderKanban size={18} className="text-orange-500" /> Your workspaces
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {list.length === 0 ? 'Nothing here yet — carve out a space for your team.' : `${list.length} workspace${list.length === 1 ? '' : 's'} · ${totalBoards} board${totalBoards === 1 ? '' : 's'} across everything`}
            </p>
          </div>
        </div>

        {workspaces.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState onNew={() => setOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((ws) => (
              <WorkspaceCard key={ws.id} ws={ws} />
            ))}
            <CreateTile onClick={() => setOpen(true)} />
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create a workspace">
        <WorkspaceForm loading={create.isPending} onSubmit={(v) => create.mutate(v)} />
      </Modal>

      <HomeTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-extrabold sm:text-2xl">{value}</p>
      <p className="text-[11px] font-medium tracking-wide text-teal-50/80 uppercase">{label}</p>
    </div>
  );
}

function WorkspaceCard({ ws }: { ws: WorkspaceSummary }) {
  return (
    <Link
      to={`/workspaces/${ws.id}`}
      className="tour-workspace-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl hover:shadow-teal-700/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-600"
    >
      <div className="animate-gradient absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-600 via-teal-500 to-orange-400 opacity-70" />
      <ArrowUpRight
        size={16}
        className="absolute top-4 right-4 z-10 text-slate-300 opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-orange-500"
      />
      <div
        className={cn(
          'mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-105',
          ws.logo
            ? 'bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-950/60 dark:ring-orange-900'
            : 'bg-gradient-to-br from-teal-600 to-orange-500 text-sm font-bold text-white'
        )}
      >
        {ws.logo || ws.key}
      </div>
      <h3 className="flex items-center gap-1.5 font-semibold group-hover:text-orange-700 dark:group-hover:text-orange-300">
        <span className="truncate">{ws.name}</span>
        <PlanBadge plan={ws.plan} />
      </h3>
      <p className="mt-1 line-clamp-2 min-h-[2rem] text-sm text-slate-500 dark:text-slate-400">
        {ws.description || 'No description yet.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
          <KanbanSquare size={12} /> {ws.boardCount} board{ws.boardCount === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300">
          {roleLabel[ws.role] ?? ws.role}
        </span>
      </div>
    </Link>
  );
}

function CreateTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tour-new-workspace group flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-5 text-slate-400 transition hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-500 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-orange-500 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90 dark:bg-slate-800">
        <Plus size={20} />
      </span>
      <span className="text-sm font-semibold">Create a workspace</span>
      <span className="text-xs">New team or project</span>
    </button>
  );
}

function WorkspaceForm({ onSubmit, loading }: { onSubmit: (v: { name: string; key: string; logo: string }) => void; loading: boolean }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [logo, setLogo] = useState('🚀');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !key) return;
    onSubmit({ name, key, logo });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} label="Workspace name" placeholder="Acme Launch" required autoFocus />
      <Input value={key} onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 4))} label="Key" placeholder="ACM" required />
      <LogoPicker value={logo} onChange={setLogo} />
      <Button type="submit" loading={loading}>Create workspace</Button>
    </form>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-orange-400/10 blur-2xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-2xl" />
      <div className="relative">
        <div className="animate-gradient mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-teal-500 to-orange-400 text-white shadow-lg shadow-teal-800/25">
          <FolderKanban size={28} />
        </div>
        <h3 className="text-lg font-semibold">No workspaces yet</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Create your first workspace to start collaborating with your team.
        </p>
        <Button className="mt-5" onClick={onNew}>
          <Plus size={16} /> Create workspace
        </Button>
      </div>
    </div>
  );
}