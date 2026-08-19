import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { register } from '../api/auth';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { connectSocket } from '../store/socket';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { AuthShell } from '../components/AuthShell';
import { usePageMeta, DEFAULT_OG_IMAGE } from '../lib/seo';
import { finishAfterAuth } from '../api/invites';

export function RegisterPage() {
  usePageMeta({
    title: 'Create your free account — Nexora',
    description: 'Start planning smarter with Nexora — kanban boards, milestones, team chat and an AI assistant. Free for small teams.',
    path: '/register',
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
      const result = await register(
        String(data.get('name')),
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
    <AuthShell title="Create your account">
      <form onSubmit={submit} className="space-y-4">
        <Input name="name" label="Full name" placeholder="Ada Lovelace" required autoFocus />
        <Input name="email" type="email" label="Email" placeholder="you@company.com" required />
        <Input name="password" type="password" label="Password (min 8 chars)" placeholder="••••••••" required minLength={8} />
        <Button type="submit" className="w-full" loading={loading}>Create account</Button>
      </form>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-orange-600 hover:underline dark:text-orange-400">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}