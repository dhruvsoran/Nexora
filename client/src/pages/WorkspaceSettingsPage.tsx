import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Users, CreditCard, Calendar as CalendarIcon, Crown, UserMinus, Loader2, Settings2, Save, Trash2 } from 'lucide-react';
import { getWorkspace, updateWorkspace, deleteWorkspace, updateMemberRole, removeMember, workspaceCalendar, getSubscription, subscribe, cancelSubscription, CalendarEvent } from '../api/workspaces';
import { errorMessage } from '../api/client';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { LogoPicker } from '../components/workspace/LogoPicker';
import { PlanBadge } from '../components/ui/PlanBadge';
import { cn } from '../lib/utils';

type Tab = 'general' | 'members' | 'calendar' | 'billing';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, desc: '2 boards · 5 members' },
  { id: 'pro', name: 'Pro', price: 9, desc: 'Unlimited boards · 25 members · AI' },
  { id: 'business', name: 'Business', price: 19, desc: 'Unlimited everything · Weekly AI reports' },
];

export function WorkspaceSettingsPage() {
  const { workspaceId = '' } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('general');

  const workspace = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const calendar = useQuery({
    queryKey: ['calendar', workspaceId],
    queryFn: () => workspaceCalendar(workspaceId),
    enabled: Boolean(workspaceId) && tab === 'calendar',
  });

  const subscription = useQuery({
    queryKey: ['subscription', workspaceId],
    queryFn: () => getSubscription(workspaceId),
    enabled: Boolean(workspaceId) && tab === 'billing',
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => updateMemberRole(workspaceId, memberId, role),
    onSuccess: () => {
      toast.success('Role updated');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      toast.success('Member removed');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const pickPlan = useMutation({
    mutationFn: (plan: string) => subscribe(workspaceId, plan),
    onSuccess: () => {
      toast.success('Subscription updated');
      queryClient.invalidateQueries({ queryKey: ['subscription', workspaceId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: () => cancelSubscription(workspaceId),
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: ['subscription', workspaceId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (workspace.isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-12 w-full max-w-md" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="h-56 md:col-span-2" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    );
  }
  const ws = workspace.data;
  if (!ws) return <div className="p-8 text-sm text-red-600">{errorMessage(workspace.error)}</div>;

  const tabButton = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
        tab === id ? 'bg-teal-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
      )}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-xl font-bold">
          {ws.logo && <span className="mr-2">{ws.logo}</span>}
          Workspace settings
        </h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{ws.name}</p>

        <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm dark:bg-slate-800">
          {tabButton('general', 'General', <Settings2 size={14} />)}
          {tabButton('members', 'Members', <Users size={14} />)}
          {tabButton('calendar', 'Calendar', <CalendarIcon size={14} />)}
          {tabButton('billing', 'Billing', <CreditCard size={14} />)}
        </div>

        {tab === 'general' && <GeneralTab ws={ws} workspaceId={workspaceId} />}

        {tab === 'members' && (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <ul className="divide-y divide-slate-100">
              {ws.members.map((m) => (
                <li key={m.user} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.profile?.name ?? '?'} src={m.profile?.avatar} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {m.profile?.name ?? 'Unknown'}
                      {m.role === 'owner' && <Crown size={13} className="text-orange-500" />}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{m.profile?.email ?? m.user}</p>
                  </div>
                  {m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole.mutate({ memberId: m.user, role: e.target.value })}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-orange-400"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">Owner</span>
                  )}
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => remove.mutate(m.user)}
                      className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                      title="Remove member"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'calendar' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            {calendar.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-5/6" />
              </div>
            ) : (calendar.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No milestones or dated tasks yet.</p>
            ) : (
              <GroupedCalendar events={calendar.data ?? []} />
            )}
          </div>
        )}

        {tab === 'billing' && (
          <div>
            <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current plan</p>
              {subscription.isLoading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              ) : subscription.data ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-orange-100 px-3 py-1 text-sm font-semibold capitalize text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                    {subscription.data.plan}
                  </span>
                  <PlanBadge plan={subscription.data.plan} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {subscription.data.status}
                    {subscription.data.endsAt && (
                      <> · ends {format(new Date(subscription.data.endsAt), 'MMM d, yyyy')}</>
                    )}
                  </span>
                  <button
                    onClick={() => cancel.mutate()}
                    disabled={cancel.isPending}
                    className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancel.isPending ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Free plan</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-xl border bg-white dark:bg-slate-800 p-5 shadow-sm',
                    subscription.data?.plan === p.id ? 'border-orange-400 ring-1 ring-orange-200' : 'border-slate-200 dark:border-slate-700'
                  )}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {p.name}
                    {subscription.data?.plan === p.id && <PlanBadge plan={p.id} />}
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    ${p.price}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/mo</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{p.desc}</p>
                  <button
                    onClick={() => pickPlan.mutate(p.id)}
                    disabled={pickPlan.isPending || subscription.data?.plan === p.id}
                    className={cn(
                      'mt-4 w-full rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50',
                      p.id === 'business'
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'bg-teal-700 text-white hover:bg-teal-800'
                    )}
                  >
                    {pickPlan.isPending ? <Loader2 size={12} className="mx-auto animate-spin" /> : subscription.data?.plan === p.id ? 'Current plan' : `Choose ${p.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralTab({ ws, workspaceId }: { ws: { id: string; name: string; description?: string; logo: string; key: string; myRole: string }; workspaceId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(ws.name);
  const [description, setDescription] = useState(ws.description ?? '');
  const [logo, setLogo] = useState(ws.logo || '🚀');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = useMutation({
    mutationFn: () => updateWorkspace(workspaceId, { name, description, logo }),
    onSuccess: () => {
      toast.success('Workspace updated');
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const destroy = useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: async () => {
      toast.success('Workspace deleted');
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/workspaces');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate();
  };

  const isOwner = ws.myRole === 'owner';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl ring-1 ring-orange-200 dark:bg-orange-950/60 dark:ring-orange-900">
              {logo || ws.key}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Workspace identity</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pick a logo emoji shown across Nexora.</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="What is this workspace about?"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Logo</label>
            <LogoPicker value={logo} onChange={setLogo} />
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-700">
            <button
              type="submit"
              disabled={save.isPending || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save changes
            </button>
          </div>
        </form>
      </div>

      {isOwner && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
            <Trash2 size={15} /> Danger zone
          </h3>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
            Permanently delete this workspace and every board, task, message, and file inside it. This cannot be undone.
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={destroy.isPending}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-red-950/30"
          >
            Delete workspace
          </button>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete workspace?">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Deleting <span className="font-semibold text-slate-800 dark:text-slate-100">&quot;{ws.name}&quot;</span> will permanently erase all
            boards, tasks, milestones, messages, comments, and notifications in this workspace. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={destroy.isPending}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => destroy.mutate()}
              disabled={destroy.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {destroy.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Yes, delete forever
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GroupedCalendar({ events }: { events: CalendarEvent[] }) {
  const withDate = events
    .filter((e) => e.date)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));

  const groups = new Map<string, typeof withDate>();
  for (const e of withDate) {
    const key = String(e.date).slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  if (withDate.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No dated events.</p>;
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([date, items]) => (
        <div key={date}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {format(new Date(date), 'EEEE, MMM d')}
          </p>
          <ul className="space-y-1.5">
            {items.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800/60 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      e.kind === 'milestone' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                    )}
                  >
                    {e.kind}
                  </span>
                  {e.title}
                </span>
                {e.completed && <span className="text-xs text-orange-600 dark:text-orange-300">done</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}