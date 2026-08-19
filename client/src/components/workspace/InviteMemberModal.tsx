import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Mail, Copy, Check, Trash2, Link2 } from 'lucide-react';
import { createInvite, listInvites, revokeInvite } from '../../api/invites';
import { errorMessage } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const roles = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
];

export function InviteMemberModal({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pending = useQuery({
    queryKey: ['invites', workspaceId],
    queryFn: () => listInvites(workspaceId),
    enabled: open && Boolean(workspaceId),
  });

  const create = useMutation({
    mutationFn: () => createInvite(workspaceId, email, role),
    onSuccess: (res) => {
      toast.success(res.emailSent ? `Invitation email sent to ${email}` : 'Invitation created');
      setEmail('');
      setLastLink(res.previewUrl ?? null);
      queryClient.invalidateQueries({ queryKey: ['invites', workspaceId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvite(id),
    onSuccess: () => {
      toast.success('Invitation revoked');
      queryClient.invalidateQueries({ queryKey: ['invites', workspaceId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    create.mutate();
  };

  const copy = async () => {
    if (!lastLink) return;
    try {
      await navigator.clipboard.writeText(lastLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite teammates by email">
      <p className="mb-4 -mt-2 text-sm text-slate-500 dark:text-slate-400">
        They'll receive an email with a secure link to join this workspace.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            label="Email"
            placeholder="teammate@company.com"
            required
            className="flex-1"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-400 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" loading={create.isPending} className="w-full">
          <Mail size={16} /> Send invitation
        </Button>
      </form>

      {lastLink && (
        <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900/60 dark:bg-teal-950/30">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200">
            <Link2 size={13} /> Email delivery isn't configured yet (SMTP). Share this link manually:
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {lastLink}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Copy link"
            >
              {copied ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {pending.data && pending.data.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Pending invites ({pending.data.length})
          </p>
          <ul className="space-y-2">
            {pending.data.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <Mail size={14} className="shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-sm">{inv.email}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                    inv.role === 'admin'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {inv.role}
                </span>
                <span className="hidden text-[11px] text-slate-400 sm:block">
                  {format(new Date(inv.expiresAt), 'MMM d')}
                </span>
                <button
                  onClick={() => revoke.mutate(inv.id)}
                  className="rounded p-1 text-slate-400 transition hover:text-red-500"
                  title="Revoke invitation"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}