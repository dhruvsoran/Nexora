import { api } from './client';
import { NotificationItem } from './types';

export async function getNotifications(): Promise<{ notifications: NotificationItem[]; unread: number }> {
  const { data } = await api.get<{ data: { notifications: NotificationItem[]; unread: number } }>('/notifications');
  return data.data;
}

export function markRead(ids: string[]) {
  return api.post('/notifications/read', { ids });
}

export function markAllRead() {
  return api.post('/notifications/read-all');
}