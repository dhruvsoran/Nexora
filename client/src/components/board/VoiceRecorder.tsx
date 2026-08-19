import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Mic, Square, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { VoiceNote } from '../../api/types';
import { uploadFile } from '../../api/upload';
import { attachVoiceNote, deleteVoiceNote } from '../../api/boards';
import { errorMessage } from '../../api/client';
import { Avatar } from '../ui/Avatar';

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function VoiceRecorder({
  boardId,
  taskId,
  notes = [],
  currentUserId,
  onChanged,
}: {
  boardId: string;
  taskId: string;
  notes?: VoiceNote[];
  currentUserId?: string;
  onChanged: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [supported] = useState(() => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopTracks(streamRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = finish;
      recorder.start();
      startRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    } catch {
      toast.error('Microphone access denied. Allow the mic to record a voice note.');
    }
  };

  const stop = () => recorderRef.current?.stop();

  const finish = async () => {
    stopTracks(streamRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);

    const durationMs = Date.now() - startRef.current;
    const mime = recorderRef.current?.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mime });
    if (blob.size === 0) return;

    setUploading(true);
    try {
      const ext = mime.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mime });
      const up = await uploadFile(file);
      await attachVoiceNote(boardId, taskId, {
        attachment: { publicId: up.publicId, url: up.url, name: up.name },
        durationMs,
        mime,
      });
      toast.success('Voice note added');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (noteId: string) => {
    try {
      await deleteVoiceNote(boardId, taskId, noteId);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (!supported) {
    return (
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        Voice notes aren’t supported in this browser.
      </p>
    );
  }

  const noteId = (n: VoiceNote) => n.id ?? n._id ?? '';
  const authorId = (n: VoiceNote) => n.by?.id ?? n.by?._id;

  return (
    <div className="space-y-2.5">
      {recording ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/30">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording… {seconds}s</span>
          <button
            onClick={stop}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            <Square size={12} /> Stop
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-3 py-2.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100 disabled:opacity-50 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
          {uploading ? 'Uploading…' : 'Record a voice note'}
        </button>
      )}

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={noteId(n)} className="rounded-lg bg-slate-100 p-2.5 dark:bg-slate-900/50">
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar name={n.by?.name ?? '?'} size={20} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {n.by?.name ?? 'Unknown'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Mic size={11} />
                  {formatDuration(n.durationMs)}
                </span>
                {currentUserId && authorId(n) && String(authorId(n)) === currentUserId && (
                  <button
                    onClick={() => remove(noteId(n))}
                    title="Delete voice note"
                    className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <audio controls preload="metadata" src={n.url} className="h-9 w-full" />
              {n.createdAt && (
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}