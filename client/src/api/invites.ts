import { api } from './client';
import type { NavigateFunction } from 'react-router-dom';

export const PENDING_INVITE_KEY = 'nexora-pending-invite';

export interface InviteRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteRequestResult {
  invite: InviteRecord;
  emailSent: boolean;
  emailError?: string;
  previewUrl?: string;
}

export function createInvite(workspaceId: string, email: string, role = 'member'): Promise<InviteRequestResult> {
  return api.post<{ data: InviteRequestResult }>('/invites', { workspaceId, email, role }).then((r) => r.data.data);
}

export function listInvites(workspaceId: string): Promise<InviteRecord[]> {
  return api.get<{ data: InviteRecord[] }>(`/invites/workspace/${workspaceId}`).then((r) => r.data.data);
}

export function revokeInvite(id: string) {
  return api.delete(`/invites/${id}`);
}

export interface InvitePreview {
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  expired: boolean;
  userExists: boolean;
  workspace: { id: string; name: string; logo: string };
  inviter: string | null;
}

export function getInvite(token: string): Promise<InvitePreview> {
  return api.get<{ data: InvitePreview }>(`/invites/${token}`).then((r) => r.data.data);
}

export function acceptInvite(token: string): Promise<{ workspaceId: string; alreadyMember?: boolean }> {
  return api
    .post<{ data: { workspaceId: string; alreadyMember?: boolean } }>(`/invites/${token}/accept`)
    .then((r) => r.data.data);
}

export async function finishAfterAuth(navigate: NavigateFunction): Promise<void> {
  const token = sessionStorage.getItem(PENDING_INVITE_KEY);
  if (!token) {
    navigate('/workspaces');
    return;
  }
  sessionStorage.removeItem(PENDING_INVITE_KEY);
  try {
    const res = await acceptInvite(token);
    navigate(`/workspaces/${res.workspaceId}`);
  } catch {
    navigate('/workspaces');
  }
}