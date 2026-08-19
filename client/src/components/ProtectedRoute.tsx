import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { connectSocket } from '../store/socket';
import { useEffect, useState } from 'react';
import { fetchMe } from '../api/auth';
import { Spinner } from './ui/Spinner';

export function ProtectedRoute() {
  const { accessToken, user, setUser } = useAuthStore();
  const [checking, setChecking] = useState(Boolean(accessToken) && !user);

  useEffect(() => {
    if (accessToken && !user) {
      fetchMe()
        .then((u) => {
          setUser(u);
          connectSocket();
        })
        .catch(() => useAuthStore.getState().logout())
        .finally(() => setChecking(false));
    }
  }, [accessToken, user, setUser]);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (checking) return <Spinner label="Checking session..." />;
  return <Outlet />;
}