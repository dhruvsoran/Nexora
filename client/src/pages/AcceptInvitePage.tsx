import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Sparkles, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { getInvite, acceptInvite, PENDING_INVITE_KEY } from '../api/invites';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { usePageMeta } from '../lib/seo';
import { cn } from '../lib/utils';

export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const invite = useQuery({
    queryKey: ['invite', token],
    queryFn: () => getInvite(token),
    enabled: Boolean(token),
    retry: false,
  });

  usePageMeta({
    title: invite.data ? `Join ${invite.data.workspace.name} on Nexora` : "You're invited to Nexora",
    description: invite.data
      ? `You have been invited to join ${invite.data.workspace.name} on Nexora — boards, milestones, chat and an AI assistant.`
      : 'You have been invited to collaborate on Nexora.',
    path: `/invite/${token}`,
  });

  const accept = useMutation({
    mutationFn: () => acceptInvite(token),
    onSuccess: (res) => {
      toast.success('You joined the workspace!');
      navigate(`/workspaces/${res.workspaceId}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const storePending = () => {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  };

  const data = invite.data;
  const emailMismatch = Boolean(user && data && data.email.toLowerCase() !== user.email.toLowerCase());
  const alreadyMember = Boolean(user && data && data.userExists);

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo to="/" />
        </div>

        <div className="animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-teal-700/10 dark:border-slate-700 dark:bg-slate-900">
          {invite.isLoading && (
            <div className="flex justify-center p-12">
              <Spinner />
            </div>
          )}

          {invite.isError && (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Mail size={26} />
              </div>
              <h1 className="text-lg font-semibold">Invitation unavailable</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{errorMessage(invite.error)}</p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline dark:text-orange-300"
              >
                Back to home <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {data && (
            <div className="p-6 text-center sm:p-8">
              <div
                className={cn(
                  'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-lg',
                  data.workspace.logo
                    ? 'bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-950/60 dark:ring-orange-900'
                    : 'animate-gradient bg-gradient-to-br from-teal-600 to-orange-500 text-white'
                )}
              >
                {data.workspace.logo || '📋'}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data.inviter ? (
                  <>
                    <b className="text-slate-700 dark:text-slate-200">{data.inviter}</b> invited you to join
                  </>
                ) : (
                  'You are invited to join'
                )}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{data.workspace.name}</h1>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  {data.role === 'admin' ? 'Admin access' : 'Member access'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium',
                    data.expired
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <Clock size={12} /> {data.expired ? 'Expired' : 'Expires in 7 days'}
                </span>
              </div>

              {data.expired && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
                  This invitation has expired. Ask the workspace owner to send a new one.
                </p>
              )}

              {data.expired || data.status !== 'pending' ? null : user ? (
                <div className="mt-6">
                  {emailMismatch && (
                    <p className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                      This invite was sent to <b>{data.email}</b>, but you're signed in as <b>{user.email}</b>. Sign out
                      and accept it with the invited account.
                    </p>
                  )}
                  {alreadyMember ? (
                    <Button className="w-full" onClick={() => navigate(`/workspaces/${data.workspace.id}`)}>
                      <CheckCircle2 size={16} /> You're already a member — open workspace
                    </Button>
                  ) : (
                    <Button className="w-full" loading={accept.isPending} onClick={() => accept.mutate()}>
                      <Sparkles size={16} /> Accept invitation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-2.5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sign in or create a free account with <b>{data.email}</b> to join.
                  </p>
                  <Link
                    to="/login"
                    state={{ invite: token }}
                    onClick={storePending}
                    className="block w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 active:bg-teal-900"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    state={{ invite: token }}
                    onClick={storePending}
                    className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Create an account
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Boards, milestones, team chat and an AI assistant — all in one workspace.
        </p>
      </div>
    </div>
  );
}