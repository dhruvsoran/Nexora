import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, LogOut, UserCircle2, Save } from 'lucide-react';
import { updateProfile, logout } from '../api/auth';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { disconnectSocket } from '../store/socket';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

function isValidAvatarUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, setUser, setAccessToken } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [title, setTitle] = useState(user?.title ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [avatarError, setAvatarError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValidAvatarUrl(avatar)) {
      setAvatarError('Enter a valid http(s) image URL, or leave it empty.');
      return;
    }
    setAvatarError('');
    setSaving(true);
    try {
      const updated = await updateProfile({ name, title, bio, avatar });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      disconnectSocket();
      setAccessToken(null);
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/workspaces"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={16} /> Workspaces
            </Link>
            <span className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />
            <Logo to="/workspaces" size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center gap-3">
          <Avatar name={user?.name ?? '?'} src={avatar || user?.avatar} size={48} />
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Profile settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <UserCircle2 size={16} /> Personal details
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} label="Full name" placeholder="Jane Doe" required />
            <Input value={title} onChange={(e) => setTitle(e.target.value)} label="Title" placeholder="Product manager" />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="A short intro about yourself"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Avatar</label>
              <div className="flex items-center gap-3">
                <Avatar name={name || user?.name || '?'} src={avatar || user?.avatar} size={56} />
                <div className="min-w-0 flex-1">
                  <input
                    value={avatar}
                    onChange={(e) => {
                      setAvatar(e.target.value);
                      setAvatarError('');
                    }}
                    placeholder="https://example.com/me.jpg"
                    className={cn(
                      'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
                      avatarError ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                    )}
                  />
                  {avatarError ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{avatarError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      This picture shows up next to your name everywhere — mentions, task assignees and chat. Leave empty to use your initials.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                <Save size={15} /> Save changes
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
          <h2 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Session</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Sign out of Nexora on this device.</p>
          <Button variant="danger" onClick={handleLogout}>
            <LogOut size={15} /> Log out
          </Button>
        </div>
      </main>
    </div>
  );
}
