import { api } from './client';
import { Workspace, WorkspaceSummary } from './types';

export function getWorkspaces(): Promise<WorkspaceSummary[]> {
  return api.get<{ data: WorkspaceSummary[] }>('/workspaces').then((r) => r.data.data);
}

export function getWorkspace(id: string): Promise<Workspace> {
  return api.get<{ data: Workspace }>(`/workspaces/${id}`).then((r) => r.data.data);
}

export function createWorkspace(payload: { name: string; description?: string; key: string; logo?: string }) {
  return api
    .post<{ data: { workspace: unknown } }>('/workspaces', payload)
    .then((r) => r.data.data.workspace);
}

export function updateWorkspace(id: string, payload: { name?: string; description?: string; logo?: string }) {
  return api.patch<{ data: { workspace: unknown } }>(`/workspaces/${id}`, payload).then((r) => r.data.data.workspace);
}

export function deleteWorkspace(id: string) {
  return api.delete(`/workspaces/${id}`);
}

export function inviteMember(id: string, email: string, role?: string) {
  return api.post(`/workspaces/${id}/members`, { email, role });
}

export function removeMember(id: string, memberId: string) {
  return api.delete(`/workspaces/${id}/members/${memberId}`);
}

export function updateMemberRole(id: string, memberId: string, role: string) {
  return api.patch(`/workspaces/${id}/members/${memberId}`, { role });
}

export interface CalendarEvent {
  id: string;
  kind: 'milestone' | 'task';
  title: string;
  date: string | null;
  completed: boolean;
  board?: string;
  boardName?: string;
}

export function workspaceCalendar(id: string): Promise<CalendarEvent[]> {
  return api.get<{ data: CalendarEvent[] }>(`/workspaces/${id}/calendar`).then((r) => r.data.data);
}

export interface Subscription {
  plan: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export function getSubscription(id: string): Promise<Subscription> {
  return api.get<{ data: { subscription: Subscription } }>(`/workspaces/${id}/subscription`).then((r) => r.data.data.subscription);
}

export function subscribe(id: string, plan: string): Promise<Subscription> {
  return api
    .post<{ data: { subscription: Subscription } }>(`/workspaces/${id}/subscription`, { plan })
    .then((r) => r.data.data.subscription);
}

export function cancelSubscription(id: string) {
  return api.delete(`/workspaces/${id}/subscription`);
}