import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { BoardPage } from './pages/BoardPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/invite/:token', element: <AcceptInvitePage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/account', element: <AccountSettingsPage /> },
          { path: '/workspaces', element: <WorkspacesPage /> },
          {
            path: '/workspaces/:workspaceId',
            element: <WorkspaceLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'boards/:boardId', element: <BoardPage /> },
              { path: 'chat', element: <ChatPage /> },
              { path: 'chat/:channelId', element: <ChatPage /> },
              { path: 'settings', element: <WorkspaceSettingsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function RootLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return <Outlet />;
}