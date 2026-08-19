import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserCircle2, FolderKanban } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { logout } from '../../api/auth';
import { disconnectSocket } from '../../store/socket';
import { User } from '../../api/types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

export function UserMenu({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const setLogout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      disconnectSocket();
      setLogout();
      navigate('/login');
    }
  };

  const name = user?.name ?? 'Account';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
        title={name}
      >
        <Avatar name={name} src={user?.avatar} size={30} />
        <span className="hidden max-w-[110px] truncate text-sm font-medium md:block">{name}</span>
        <ChevronDown size={14} className="hidden text-slate-400 md:block" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <Avatar name={name} src={user?.avatar} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <UserCircle2 size={16} /> Profile settings
            </Link>
            <Link
              to="/workspaces"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FolderKanban size={16} /> Your workspaces
            </Link>
          </div>
          <div className="border-t border-slate-100 p-1.5 dark:border-slate-700">
            <button
              onClick={handleLogout}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
              )}
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
