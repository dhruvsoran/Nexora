import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Hash, MessageCircle, Plus, Send, Paperclip, Menu, X } from 'lucide-react';
import { getChannels, getMessages, sendMessage, openDirectMessage, createChannel } from '../api/chat';
import { uploadFile } from '../api/upload';
import { errorMessage } from '../api/client';
import { getWorkspace } from '../api/workspaces';
import { usePresence } from '../hooks/usePresence';
import { getSocket, joinChannelRoom, leaveChannelRoom, sendTyping } from '../store/socket';
import { MessageItem } from '../api/types';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';

export function ChatPage() {
  const { workspaceId = '', channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { onlineIds } = usePresence(workspaceId);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState<{ userId: string; name: string } | null>(null);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channels = useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: () => getChannels(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspace = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const activeChannel = channelId
    ? channels.data?.find((c) => c._id === channelId)
    : channels.data?.[0];

  const activeId = activeChannel?._id;

  const messagesQuery = useQuery({
    queryKey: ['messages', workspaceId, activeId],
    queryFn: () => getMessages(workspaceId, activeId!),
    enabled: Boolean(activeId),
    staleTime: 0,
  });

  useEffect(() => {
    if (messagesQuery.data) setMessages(messagesQuery.data);
  }, [messagesQuery.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!activeId) return;
    joinChannelRoom(activeId);
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg: MessageItem) => {
      if (String(msg.channel) === activeId) {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      }
    };
    const onTyping = (data: { channelId: string; userId: string; isTyping: boolean }) => {
      if (data.channelId !== activeId) return;
      const member = workspace.data?.members.find((m) => m.user === data.userId);
      if (data.isTyping) {
        setTyping({ userId: data.userId, name: member?.profile?.name ?? 'Someone' });
      } else {
        setTyping((t) => (t?.userId === data.userId ? null : t));
      }
    };

    socket.on('message:new', onMessage);
    socket.on('typing', onTyping);

    return () => {
      leaveChannelRoom(activeId);
      socket.off('message:new', onMessage);
      socket.off('typing', onTyping);
    };
  }, [activeId, workspace.data]);

  const handleSend = async (body?: string) => {
    if (!activeId) return;
    const text = (body ?? input).trim();
    if (!text) return;
    sendTyping(activeId, false);
    setInput('');
    try {
      const msg = await sendMessage(workspaceId, activeId, text);
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    } catch (err) {
      setInput(text);
      alert(errorMessage(err));
    }
  };

  const onFile = async (file: File) => {
    try {
      const up = await uploadFile(file);
      await handleSend(`[Attachment] ${up.url}`);
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const startDM = async (userId: string) => {
    try {
      const channel = await openDirectMessage(workspaceId, userId);
      navigate(`/workspaces/${workspaceId}/chat/${channel._id}`);
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  if (channels.isLoading) return <ChatSkeleton />;

  return (
    <div className="flex h-full">
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform md:static dark:border-slate-700 dark:bg-slate-800',
          menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <span className="text-sm font-semibold">Channels</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setNewChannelOpen(true)} className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-orange-600">
              <Plus size={16} />
            </button>
            <button onClick={() => setMenuOpen(false)} className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 md:hidden">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {channels.data
            ?.filter((c) => c.type === 'channel')
            .map((c) => (
              <ChannelRow
                key={c._id}
                active={c._id === activeId}
                name={c.name}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/workspaces/${workspaceId}/chat/${c._id}`);
                }}
              />
            ))}
          <p className="px-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Direct messages</p>
          {workspace.data?.members.map((m) => {
            const dm = channels.data?.find((c) => c.type === 'direct' && c.members.some((x) => x.id === m.user));
            return (
              <button
                key={m.user}
                onClick={() => {
                  setMenuOpen(false);
                  startDM(m.user);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:bg-slate-800',
                  dm && dm._id === activeId ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300' : 'text-slate-600 dark:text-slate-300'
                )}
              >
                <div className="relative">
                  <Avatar name={m.profile?.name ?? '?'} src={m.profile?.avatar} size={24} />
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white',
                      onlineIds.has(m.user) ? 'bg-teal-600' : 'bg-slate-300'
                    )}
                  />
                </div>
                <span className="flex-1 truncate text-left">{m.profile?.name}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {activeChannel ? (
          <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4">
              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
                title="Open channels"
              >
                <Menu size={17} />
              </button>
              <Hash size={16} className="text-slate-500 dark:text-slate-400" />
              <span className="truncate font-medium">{activeChannel.name}</span>
              {activeChannel.description && <span className="text-xs text-slate-500 dark:text-slate-400">· {activeChannel.description}</span>}
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-100 dark:bg-slate-800/60 p-4">
              {messages.map((m) => {
                return (
                  <div key={m._id} className="flex gap-2.5">
                    <Avatar name={m.sender.name} src={m.sender.avatar} size={34} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.sender.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{format(new Date(m.createdAt), 'MMM d, HH:mm')}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {m.body.startsWith('[Attachment]') ? (
                          <a href={m.body.replace('[Attachment] ', '')} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline dark:text-orange-300">
                            📎 {m.body.replace('[Attachment] ', '').split('/').pop()}
                          </a>
                        ) : (
                          m.body
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              {typing && <p className="text-xs text-slate-500 dark:text-slate-400">{typing.name} is typing…</p>}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
                <label className="cursor-pointer rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-orange-600">
                  <Paperclip size={16} />
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                </label>
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (activeId) {
                      sendTyping(activeId, e.target.value.length > 0);
                      if (typingTimer.current) clearTimeout(typingTimer.current);
                      typingTimer.current = setTimeout(() => sendTyping(activeId, false), 1500);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message the team…"
                  className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
                <button onClick={() => handleSend()} disabled={!input.trim()} className="rounded-lg bg-teal-700 p-2 text-white hover:bg-teal-800 disabled:opacity-40">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            <MessageCircle size={28} className="mb-2" />
            <p>Select or create a channel to start chatting.</p>
          </div>
        )}
      </div>

      {newChannelOpen && (
        <NewChannelModal
          onClose={() => setNewChannelOpen(false)}
          onSubmit={async (name) => {
            try {
              const ch = await createChannel(workspaceId, name);
              queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
              navigate(`/workspaces/${workspaceId}/chat/${ch._id}`);
              setNewChannelOpen(false);
            } catch (err) {
              alert(errorMessage(err));
            }
          }}
        />
      )}
    </div>
  );
}

function ChannelRow({ active, name, onClick }: { active: boolean; name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
        active ? 'bg-orange-50 font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
      )}
    >
      <Hash size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
      <span className="truncate">{name}</span>
    </button>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0 space-y-2 border-r border-slate-200 p-3 dark:border-slate-700">
        <Skeleton className="h-4 w-20" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewChannelModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl">
        <h3 className="mb-3 font-semibold">Create a channel</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. marketing"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-orange-400"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}