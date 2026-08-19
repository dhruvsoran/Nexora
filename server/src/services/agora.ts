import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';

const AGORA_API_BASE = 'https://api.agora.io/api/conversational-ai-agent/v2';
const TOKEN_TTL_SECONDS = 3600;
const IDLE_TIMEOUT_SECONDS = 300;
const MAX_HISTORY = 32;

function agoraCreds(): { appId: string; appCertificate: string } {
  const { appId, appCertificate } = config.agora;
  if (!appId || !appCertificate) {
    throw ApiError.internal(
      'Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in the server .env.'
    );
  }
  return { appId, appCertificate };
}

export function buildRtcToken(channel: string, uid: number | string): string {
  const { appId, appCertificate } = agoraCreds();
  const now = Math.floor(Date.now() / 1000);
  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channel,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    now + TOKEN_TTL_SECONDS
  );
}

function authHeader(): Record<string, string> {
  const { appId, appCertificate } = agoraCreds();
  const now = Math.floor(Date.now() / 1000);
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    '',
    0,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    now + TOKEN_TTL_SECONDS
  );
  return { Authorization: `agora token=${token}`, 'Content-Type': 'application/json' };
}

async function requestAgora<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${AGORA_API_BASE}${path}`, {
    method: options?.method ?? 'GET',
    headers: authHeader(),
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });

  const text = await res.text();
  let data: { message?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 200) };
  }

  if (!res.ok) {
    const detail = data.message ? `: ${data.message}` : '';
    throw ApiError.internal(`Agora API error (${res.status})${detail}`);
  }
  return data as T;
}

export interface AgoraVoiceSession {
  appId: string;
  agentId: string;
  channel: string;
  agentUid: number;
  userUid: number;
  agentToken: string;
}

export interface StartVoiceAgentOptions {
  channel: string;
  agentUid: number;
  userUid: number;
  context?: string;
}

export async function startVoiceAgent(opts: StartVoiceAgentOptions): Promise<AgoraVoiceSession> {
  const { appId } = agoraCreds();
  const agentToken = buildRtcToken(opts.channel, opts.agentUid);
  const systemPrompt = opts.context
    ? `${config.agora.aiPrompt}\n\nCurrent board context:\n${opts.context}`
    : config.agora.aiPrompt;

  const body = {
    name: `nexora-ai-${opts.agentUid}-${Date.now()}`,
    properties: {
      channel: opts.channel,
      token: agentToken,
      agent_rtc_uid: String(opts.agentUid),
      remote_rtc_uids: [String(opts.userUid)],
      idle_timeout: IDLE_TIMEOUT_SECONDS,
      asr: {
        credential_mode: 'managed',
        vendor: 'deepgram',
        params: { url: 'wss://api.deepgram.com/v1/listen', model: 'nova-3', language: 'en-US' },
      },
      llm: {
        credential_mode: 'managed',
        vendor: 'openai',
        style: 'openai',
        url: 'https://api.openai.com/v1/chat/completions',
        params: { model: 'gpt-4.1-mini' },
        system_messages: [{ role: 'system', content: systemPrompt }],
        greeting_message: "Hi, I'm Nexora AI. How can I help you with your projects today?",
        failure_message: "Sorry, I didn't catch that. Could you say it again?",
        max_history: MAX_HISTORY,
      },
      tts: {
        credential_mode: 'managed',
        vendor: 'minimax',
        params: {
          url: 'wss://api.minimax.io/ws/v1/t2a_v2',
          model: 'speech-2.6-turbo',
          voice_setting: { voice_id: 'English_captivating_female1' },
        },
      },
    },
  };

  const data = await requestAgora<{ agent_id: string }>(`/projects/${appId}/join`, {
    method: 'POST',
    body,
  });

  return {
    appId,
    agentId: data.agent_id,
    channel: opts.channel,
    agentUid: opts.agentUid,
    userUid: opts.userUid,
    agentToken,
  };
}

export async function leaveVoiceAgent(agentId: string): Promise<void> {
  const { appId } = agoraCreds();
  await requestAgora(`/projects/${appId}/agents/${agentId}/leave`, { method: 'POST' });
}

export async function getVoiceAgentStatus(agentId: string): Promise<{ status: string }> {
  const { appId } = agoraCreds();
  return requestAgora<{ status: string }>(`/projects/${appId}/agents/${agentId}`);
}