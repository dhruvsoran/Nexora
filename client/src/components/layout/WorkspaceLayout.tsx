import { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  KanbanSquare,
  MessageSquare,
  Bell,
  Plus,
  Users,
  Settings,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { getWorkspace } from '../../api/workspaces';
import { createBoardIn } from '../../api/boards';
import { errorMessage } from '../../api/client';
import { useNotifications } from '../../hooks/useNotifications';
import { ConversationModal } from '../ai/ConversationModal';
import { InviteMemberModal } from '../workspace/InviteMemberModal';
import { Logo, LogoMark } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { PlanBadge } from '../ui/PlanBadge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';
import { UserMenu } from './UserMenu';

export function WorkspaceLayout() {
  const { workspaceId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('nexora-sidebar') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem('nexora-sidebar', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const workspace = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const notifications = useNotifications();

  const createBoard = useMutation({
    mutationFn: (input: { name: string; key: string }) => createBoardIn(workspaceId, input),
    onSuccess: async (board) => {
      toast.success('Board created');
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      navigate(`/workspaces/${workspaceId}/boards/${(board as unknown as { _id?: string; id?: string })._id ?? (board as unknown as { id?: string }).id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (workspace.isLoading) {
    return (
      <div className="flex h-full">
        <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 lg:flex">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-9 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
          <div className="mt-auto space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </aside>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div>
              <Skeleton className="mb-2 h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Skeleton className="h-72 md:col-span-2" />
              <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (workspace.isError || !workspace.data) {
    return <div className="p-8 text-red-600 text-sm">{errorMessage(workspace.error)}</div>;
  }

  const ws = workspace.data;
  const boardLink = (boardId: string) => `/workspaces/${ws.id}/boards/${boardId}`;

  return (
    <div className="flex h-full">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-700 dark:bg-slate-900',
          'lg:static lg:z-auto lg:transition-[width]',
          collapsed && 'lg:w-[70px]',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-700',
            collapsed ? 'px-2' : 'px-3'
          )}
        >
          <div className={cn('flex min-w-0 items-center', collapsed && 'lg:flex-1 lg:justify-center')}>
            <Logo to="/" size="sm" className={cn(collapsed && 'lg:hidden')} />
            {collapsed && <LogoMark className="hidden h-6 w-6 lg:flex" />}
          </div>
          <div className="flex items-center gap-0.5">
            <span className={cn(collapsed && 'lg:hidden')}>
              <ThemeToggle />
            </span>
            <button
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:block',
                collapsed && 'lg:p-1'
              )}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className={cn('flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700', collapsed && 'lg:justify-center lg:px-2')}>
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base font-bold',
              ws.logo ? 'bg-orange-50 dark:bg-orange-950/60' : 'bg-gradient-to-br from-teal-600 to-orange-500 text-sm text-white'
            )}
          >
            {ws.logo || ws.key}
          </div>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
              <span className="truncate">{ws.name}</span>
              <PlanBadge plan={ws.subscription?.plan} />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{ws.boards.length} boards</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem to={`/workspaces/${ws.id}`} icon={<LayoutDashboard size={16} />} label="Dashboard" end collapsed={collapsed} />

          <p className={cn('px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400', collapsed && 'lg:hidden')}>
            Boards
          </p>
          {ws.boards.map((board) => (
            <NavItem key={board.id} to={boardLink(board.id)} icon={<KanbanSquare size={16} />} label={board.name} collapsed={collapsed} />
          ))}
          <button
            onClick={() => setCreateOpen(true)}
            title="New board"
            className={cn(
              'flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600',
              collapsed ? 'ml-0 w-full justify-center lg:px-0' : 'ml-1'
            )}
          >
            <Plus size={14} /> <span className={cn(collapsed && 'lg:hidden')}>New board</span>
          </button>

          <p className={cn('px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400', collapsed && 'lg:hidden')}>
            Team
          </p>
          <NavItem to={`/workspaces/${ws.id}/chat`} icon={<MessageSquare size={16} />} label="Chat" end collapsed={collapsed} />
          <button
            onClick={() => setInviteOpen(true)}
            title="Invite member"
            className={cn(
              'flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600',
              collapsed ? 'ml-0 w-full justify-center lg:px-0' : 'ml-1'
            )}
          >
            <Plus size={14} /> <span className={cn(collapsed && 'lg:hidden')}>Invite member</span>
          </button>

          <div className={cn('mt-4 rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3', collapsed && 'lg:hidden')}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Users size={13} /> {ws.members.length} members
            </p>
            <div className="flex -space-x-2">
              {ws.members.slice(0, 6).map((m) => (
                <Avatar key={m.user} name={m.profile?.name ?? '?'} src={m.profile?.avatar} size={26} />
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 lg:hidden"
            >
              <Menu size={19} />
            </button>
            <span className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">{ws.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVoiceOpen(true)}
              title="Talk to Nexora AI"
              className="rounded-lg bg-gradient-to-br from-teal-600 to-orange-500 p-2 text-white hover:opacity-90"
            >
              <Mic size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative rounded-lg p-2 hover:bg-slate-100 dark:bg-slate-900 ${notifOpen ? 'bg-slate-100 dark:bg-slate-900' : ''}`}
              >
                <Bell size={18} />
                {(notifications.data?.unread ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {notifications.data!.unread}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}
            </div>

            <Link title="Workspace settings" to={`/workspaces/${ws.id}/settings`} className="rounded-lg p-2 hover:bg-slate-100 dark:bg-slate-900">
              <Settings size={18} />
            </Link>

            <div className="border-l border-slate-200 pl-1.5 dark:border-slate-700">
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <div key={location.pathname} className="animate-fade-in h-full">
            <Outlet />
          </div>
        </main>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a board">
        <BoardCreateForm loading={createBoard.isPending} onSubmit={(v) => createBoard.mutate(v)} />
      </Modal>

      <InviteMemberModal workspaceId={ws.id} open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <ConversationModal open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  end,
  collapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition',
          collapsed && 'lg:justify-center lg:px-0',
          isActive ? 'bg-orange-50 text-orange-700 font-medium dark:bg-orange-950/50 dark:text-orange-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-900'
        )
      }
    >
      {icon}
      <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
    </NavLink>
  );
}

function BoardCreateForm({ onSubmit, loading }: { onSubmit: (v: { name: string; key: string }) => void; loading: boolean }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !key) return;
    onSubmit({ name, key });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} label="Name" placeholder="Sprint 2" required />
      <Input value={key} onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 4))} label="Key" placeholder="SP2" required />
      <Button type="submit" loading={loading}>Create</Button>
    </form>
  );
}

function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useNotifications();
  const markAll = () => import('../../api/notifications').then((m) => m.markAllRead()).then(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('All notifications read');
  });

  const list = data?.notifications ?? [];
  return (
    <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-semibold">Notifications</span>
        {list.some((n) => !n.read) && (
          <button onClick={markAll} className="text-xs text-orange-600 hover:underline dark:text-orange-300">
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {list.length === 0 && <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>}
        {list.map((n) => (
          <Link
            key={n._id}
            to={n.link || '#'}
            onClick={() => {
              import('../../api/notifications').then((m) => m.markRead([n._id]));
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
              onClose();
            }}
            className={`block border-b px-4 py-2.5 transition hover:bg-slate-100 dark:bg-slate-800/60 ${n.read ? '' : 'bg-orange-50/60 dark:bg-orange-950/40'}`}
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
            {n.body && <p className="text-xs text-slate-500 dark:text-slate-400">{n.body}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
