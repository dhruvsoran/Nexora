import { api } from './client';
import { Channel, MessageItem } from './types';

export function getChannels(workspaceId: string): Promise<Channel[]> {
  return api.get<{ data: Channel[] }>(`/workspaces/${workspaceId}/channels`).then((r) => r.data.data);
}

export function createChannel(workspaceId: string, name: string, description?: string) {
  return api.post<{ data: { channel: Channel } }>(`/workspaces/${workspaceId}/channels`, {
    name,
    description,
  }).then((r) => r.data.data.channel);
}

export function openDirectMessage(workspaceId: string, userId: string): Promise<Channel> {
  return api
    .post<{ data: { channel: Channel } }>(`/workspaces/${workspaceId}/dms/${userId}`)
    .then((r) => r.data.data.channel);
}

export function getMessages(workspaceId: string, channelId: string, before?: string): Promise<MessageItem[]> {
  const params = before ? { before } : {};
  return api
    .get<{ data: MessageItem[] }>(`/workspaces/${workspaceId}/channels/${channelId}/messages`, { params })
    .then((r) => r.data.data);
}

export function sendMessage(workspaceId: string, channelId: string, body: string, attachments: unknown[] = []) {
  return api.post<{ data: { message: MessageItem } }>(
    `/workspaces/${workspaceId}/channels/${channelId}/messages`,
    { body, attachments }
  ).then((r) => r.data.data.message);
}

export function getPresence(workspaceId: string): Promise<string[]> {
  return api.get<{ data: { online: string[] } }>(`/workspaces/${workspaceId}/presence`).then((r) => r.data.data.online);
}