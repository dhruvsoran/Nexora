import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { login } from '../api/auth';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { connectSocket } from '../store/socket';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { AuthShell } from '../components/AuthShell';
import { usePageMeta, DEFAULT_OG_IMAGE } from '../lib/seo';
import { finishAfterAuth } from '../api/invites';

export function LoginPage() {
  usePageMeta({
    title: 'Sign in — Nexora',
    description: 'Sign in to Nexora to open your boards, milestones, team chat and AI assistant.',
    path: '/login',
    image: DEFAULT_OG_IMAGE,
  });
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await login(
        String(data.get('email')),
        String(data.get('password'))
      );
      setAuth(result.accessToken);
      setUser(result.user);
      connectSocket();
      await finishAfterAuth(navigate);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
      <AuthShell title="Sign in to Nexora">
      <form onSubmit={submit} className="space-y-4">
        <Input name="email" type="email" label="Email" placeholder="you@company.com" required autoFocus />
        <Input name="password" type="password" label="Password" placeholder="••••••••" required />
        <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
      </form>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        No account?{' '}
        <Link to="/register" className="font-medium text-orange-600 hover:underline dark:text-orange-400">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}