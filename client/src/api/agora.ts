import { api } from './client';

export interface VoiceSessionData {
  appId: string;
  agentId: string;
  channel: string;
  userUid: number;
  userToken: string;
}

export function startVoiceSession(context?: string): Promise<VoiceSessionData> {
  return api
    .post<{ data: VoiceSessionData }>('/agora/voice/session', { context })
    .then((r) => r.data.data);
}

export function stopVoiceSession(agentId: string): Promise<void> {
  return api.post(`/agora/voice/session/${agentId}/leave`).then(() => undefined);
}

export function getVoiceSession(agentId: string): Promise<{ status: string }> {
  return api.get<{ data: { status: string } }>(`/agora/voice/session/${agentId}`).then((r) => r.data.data);
}