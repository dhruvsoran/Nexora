import { useEffect, useRef, useState } from 'react';
import type { ConnectionState, IAgoraRTCClient, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, PhoneOff, Sparkles, RotateCw } from 'lucide-react';
import { startVoiceSession, stopVoiceSession, VoiceSessionData } from '../../api/agora';
import { errorMessage } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

type Phase = 'idle' | 'connecting' | 'connected' | 'ending' | 'error';

interface Props {
  open: boolean;
  onClose: () => void;
  context?: string;
}

export function ConversationModal({ open, onClose, context }: Props) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const sessionRef = useRef<VoiceSessionData | null>(null);
  const connectRef = useRef<(() => Promise<void>) | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let disposed = false;

    const teardown = async () => {
      const client = clientRef.current;
      const track = audioTrackRef.current;
      const session = sessionRef.current;
      clientRef.current = null;
      audioTrackRef.current = null;
      sessionRef.current = null;
      if (client) client.removeAllListeners();
      try {
        await client?.leave();
      } catch {
        /* noop */
      }
      try {
        track?.close();
      } catch {
        /* noop */
      }
      if (session) {
        try {
          await stopVoiceSession(session.agentId);
        } catch {
          /* noop */
        }
      }
    };

    const connect = async () => {
      setError('');
      setPhase('connecting');
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        const session = await startVoiceSession(context);
        if (disposed) {
          try {
            await stopVoiceSession(session.agentId);
          } catch {
            /* noop */
          }
          return;
        }
        sessionRef.current = session;

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('user-published', async (user, mediaType) => {
          if (mediaType === 'audio') {
            await client.subscribe(user, mediaType);
            user.audioTrack?.play();
          }
        });
        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'audio') user.audioTrack?.stop();
        });
        client.on('connection-state-change', (state: ConnectionState) => {
          if (disposed) return;
          if (state === 'CONNECTED') setPhase('connected');
          else if (state === 'RECONNECTING' || state === 'CONNECTING') setPhase('connecting');
          else if (state === 'DISCONNECTED') setPhase('idle');
        });

        await client.join(session.appId, session.channel, session.userToken, session.userUid);
        const track = await AgoraRTC.createMicrophoneAudioTrack();
        audioTrackRef.current = track;
        await client.publish(track);
        if (disposed) {
          void teardown();
          return;
        }
        setPhase('connected');
      } catch (err) {
        if (disposed) return;
        setError(errorMessage(err));
        setPhase('error');
        void teardown();
      }
    };

    connectRef.current = connect;
    void connect();

    return () => {
      disposed = true;
      void teardown();
    };
  }, [open, context]);

  const endCall = async () => {
    setPhase('ending');
    const client = clientRef.current;
    const track = audioTrackRef.current;
    const session = sessionRef.current;
    clientRef.current = null;
    audioTrackRef.current = null;
    sessionRef.current = null;
    if (client) client.removeAllListeners();
    try {
      await client?.leave();
    } catch {
      /* noop */
    }
    try {
      track?.close();
    } catch {
      /* noop */
    }
    if (session) {
      try {
        await stopVoiceSession(session.agentId);
      } catch {
        /* noop */
      }
    }
    setPhase('idle');
    onClose();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    void audioTrackRef.current?.setEnabled(!next);
  };

  const statusText =
    phase === 'connecting'
      ? 'Connecting to Nexora AI...'
      : phase === 'connected'
        ? 'Listening... talk to Nexora AI'
        : phase === 'ending'
          ? 'Ending call...'
          : phase === 'error'
            ? 'Could not start the conversation'
            : '';

  return (
    <Modal open={open} onClose={() => void endCall()} title="Talk to Nexora AI">
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full bg-orange-400/30 ${
              phase === 'connected' ? 'animate-ping' : ''
            }`}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-orange-500 text-white">
            {phase === 'connected' ? (
              <div className="flex items-end gap-1">
                <span className="h-4 w-1.5 animate-pulse rounded bg-white dark:bg-slate-800" />
                <span className="h-7 w-1.5 animate-pulse rounded bg-white dark:bg-slate-800 [animation-delay:150ms]" />
                <span className="h-5 w-1.5 animate-pulse rounded bg-white dark:bg-slate-800 [animation-delay:300ms]" />
                <span className="h-8 w-1.5 animate-pulse rounded bg-white dark:bg-slate-800 [animation-delay:450ms]" />
              </div>
            ) : (
              <Sparkles size={32} />
            )}
          </div>
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{statusText}</p>

        {error && <p className="max-w-xs text-center text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={toggleMute} disabled={phase !== 'connected'}>
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
            {muted ? 'Unmute' : 'Mute'}
          </Button>
          <Button variant="danger" onClick={() => void endCall()} loading={phase === 'ending'}>
            <PhoneOff size={16} />
            End call
          </Button>
          {phase === 'error' && (
            <Button variant="secondary" onClick={() => void connectRef.current?.()}>
              <RotateCw size={16} />
              Try again
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
