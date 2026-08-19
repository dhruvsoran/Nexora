import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { X, Sparkles, Trash2, Paperclip, Send, Loader2, Plus, Clock } from 'lucide-react';
import { Board, Task } from '../../api/types';
import { getTaskDetail, updateTask, addComment, deleteTask, logTime } from '../../api/boards';
import { summarizeTask, estimateTask, suggestLabels } from '../../api/ai';
import { uploadFile } from '../../api/upload';
import { getWorkspace } from '../../api/workspaces';
import { errorMessage } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';
import { VoiceRecorder } from './VoiceRecorder';

const priorityOptions = ['urgent', 'high', 'medium', 'low'];

export function TaskDrawer({ board, task, onClose }: { board: Board; task: Task; onClose: () => void }) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const detail = useQuery({
    queryKey: ['task', board.id, task.id],
    queryFn: () => getTaskDetail(board.id, task.id),
    enabled: Boolean(board.id && task.id),
  });

  const workspace = useQuery({
    queryKey: ['workspace', board.workspace],
    queryFn: () => getWorkspace(board.workspace),
    enabled: Boolean(board.workspace),
  });

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [comment, setComment] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task.id]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['task', board.id, task.id] });
    queryClient.invalidateQueries({ queryKey: ['board', board.id] });
  };

  const update = useMutation({
    mutationFn: (payload: Partial<Task>) => updateTask(board.id, task.id, payload),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => deleteTask(board.id, task.id),
    onSuccess: () => {
      toast.success('Task deleted');
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const postComment = useMutation({
    mutationFn: ({ body, attachments }: { body: string; attachments: unknown[] }) =>
      addComment(board.id, task.id, body, attachments),
    onSuccess: () => {
      setComment('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const aiSummarize = useMutation({
    mutationFn: () => summarizeTask(board.id, task.id),
    onSuccess: () => toast.success('AI summary generated'),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const aiEstimate = useMutation({
    mutationFn: () => estimateTask(board.id, title, description),
    onSuccess: (res) => {
      update.mutate({ storyPoints: res.storyPoints });
      toast.success(`Estimated at ${res.storyPoints} points`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const aiLabels = useMutation({
    mutationFn: () => suggestLabels(board.id, title, description),
    onSuccess: (labels) => {
      update.mutate({ labels: Array.from(new Set([...(task.labels ?? []), ...labels])) });
      toast.success(`Suggested labels: ${labels.join(', ')}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onFile = async (file: File) => {
    try {
      const uploaded = await uploadFile(file);
      setComment((c) => (c ? `${c}\n\n[Attachment] ${uploaded.url}` : `[Attachment] ${uploaded.url}`));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const aiResult = aiSummarize.data;
  const members = workspace.data?.members ?? [];
  const raw = detail.data?.task as { _id?: string; assignees?: Array<{ _id?: string; id?: string; name: string; email: string; avatar?: string }> } | undefined;
  const assigneeList = (raw?.assignees ?? task.assignees) as Array<{ _id?: string; id?: string; name: string; email: string; avatar?: string }>;
  const current: Task = {
    ...((raw ?? task) as Task),
    id: String(raw?._id ?? task.id),
    assignees: assigneeList.map((a) => ({
      id: String(a._id ?? a.id),
      name: a.name,
      email: a.email,
      avatar: a.avatar,
    })),
  };

  const toggleAssignee = (userId: string) => {
    const currentIds = (current.assignees ?? []).map((a) => a.id);
    const next = currentIds.includes(userId)
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    update.mutate({ assignees: next } as unknown as Partial<Task>);
  };

  const toggleLabel = (label: string) => {
    const labels = current.labels ?? [];
    update.mutate({
      labels: labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label],
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {board.key}-{task.id.slice(-5).toUpperCase()}
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== task.title && update.mutate({ title })}
              className="mt-0.5 w-full rounded border border-transparent text-lg font-semibold outline-none hover:border-slate-200 dark:border-slate-700 focus:border-orange-400"
            />
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {detail.isLoading ? (
            <Spinner />
          ) : (
            <>
              <section className="mb-5">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== task.description && update.mutate({ description })}
                  rows={4}
                  placeholder="Add a description..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-sm outline-none focus:border-orange-400"
                />
              </section>

              <section className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Voice notes
                  {(current.voiceNotes?.length ?? 0) > 0 && ` (${current.voiceNotes!.length})`}
                </label>
                <VoiceRecorder
                  boardId={board.id}
                  taskId={current.id}
                  notes={current.voiceNotes ?? []}
                  currentUserId={userId}
                  onChanged={refresh}
                />
              </section>

              <section className="mb-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Priority</label>
                  <div className="flex gap-1">
                    {priorityOptions.map((p) => (
                      <button
                        key={p}
                        onClick={() => update.mutate({ priority: p as Task['priority'] })}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium capitalize',
                          current.priority === p ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Story points</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 5, 8, 13].map((n) => (
                      <button
                        key={n}
                        onClick={() => update.mutate({ storyPoints: n })}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium',
                          current.storyPoints === n ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mb-5">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assignees</label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const active = (current.assignees ?? []).some((a) => a.id === m.user);
                    return (
                      <button
                        key={m.user}
                        onClick={() => toggleAssignee(m.user)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs',
                          active ? 'border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-950/50 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/60'
                        )}
                      >
                        <Avatar name={m.profile?.name ?? '?'} src={m.profile?.avatar} size={18} />
                        {m.profile?.name ?? 'Unknown'}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mb-5">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Labels</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(current.labels ?? []).map((label) => (
                    <button
                      key={label}
                      onClick={() => toggleLabel(label)}
                      className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                    >
                      {label} ×
                    </button>
                  ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (labelInput.trim()) toggleLabel(labelInput.trim());
                      setLabelInput('');
                    }}
                    className="flex items-center"
                  >
                    <input
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      placeholder="+ add label"
                      className="w-24 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs outline-none focus:border-orange-400"
                    />
                  </form>
                </div>
              </section>

              <section className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Due date</label>
                  {current.dueDate && (
                    <button
                      onClick={() => update.mutate({ dueDate: null })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={current.dueDate ? format(new Date(current.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => update.mutate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
                />
              </section>

              <section className="mb-5">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Milestone</label>
                <select
                  value={(current.milestone as { _id?: string } | null | undefined)?._id ?? ''}
                  onChange={(e) => update.mutate({ milestone: e.target.value || null } as unknown as Partial<Task>)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
                >
                  <option value="">No milestone</option>
                  {(board.milestones ?? []).map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </section>

              <section className="mb-5">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Time tracking</label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Clock size={14} />
                    {Math.floor((current.timeSpent ?? 0) / 60)}h {(current.timeSpent ?? 0) % 60}m logged
                  </span>
                  {(current.timeEstimate ?? 0) > 0 && (
                    <span className="text-slate-500 dark:text-slate-400">/ {(current.timeEstimate ?? 0) / 60}h estimate</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <LogTimeForm boardId={board.id} taskId={current.id} refresh={refresh} />
                  <button
                    onClick={() => update.mutate({ timeEstimate: (current.timeEstimate ?? 0) + 60 })}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/60"
                    title="Add 1 hour to estimate"
                  >
                    +1h estimate
                  </button>
                </div>
              </section>

              <section className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Subtasks ({current.subtasks?.filter((s) => s.completed).length ?? 0}/{current.subtasks?.length ?? 0})
                </label>
                <div className="space-y-1.5">
                  {(current.subtasks ?? []).map((s) => (
                    <div key={s._id} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1.5">
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() =>
                          update.mutate({
                            subtasks: (current.subtasks ?? []).map((x) =>
                              x._id === s._id ? { ...x, completed: !x.completed } : x
                            ),
                          } as Partial<Task>)
                        }
                        className="h-3.5 w-3.5 accent-orange-600"
                      />
                      <span className={s.completed ? 'text-xs text-slate-500 dark:text-slate-400 line-through' : 'text-xs text-slate-700 dark:text-slate-200'}>
                        {s.title}
                      </span>
                      <button
                        onClick={() =>
                          update.mutate({
                            subtasks: (current.subtasks ?? []).filter((x) => x._id !== s._id),
                          } as Partial<Task>)
                        }
                        className="ml-auto text-slate-300 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <AddSubtaskForm task={current} update={update} />
                </div>
              </section>

              <section className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dependencies</label>
                <div className="space-y-1.5">
                  {(current.dependencies ?? []).map((d) => (
                    <div key={d.id} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1.5">
                      <span className="text-xs text-slate-700 dark:text-slate-200">
                        {d.title} <span className="ml-1 text-[10px] lowercase text-slate-500 dark:text-slate-400">({d.status})</span>
                      </span>
                      <button
                        onClick={() =>
                          update.mutate({
                            dependencies: (current.dependencies ?? []).filter((x) => x.id !== d.id),
                          } as Partial<Task>)
                        }
                        className="ml-auto text-slate-300 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      update.mutate({
                        dependencies: [
                          ...(current.dependencies ?? []).map((d) => d.id),
                          e.target.value,
                        ],
                      } as unknown as Partial<Task>);
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-orange-400"
                  >
                    <option value="">+ add dependency from this board</option>
                    {board.tasks
                      .filter((t) => t.id !== current.id && !(current.dependencies ?? []).some((d) => d.id === t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
              </section>

              <section className="mb-5 rounded-lg border border-orange-100 bg-orange-50/60 p-3 dark:border-orange-900/60 dark:bg-orange-950/30">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-orange-700 dark:text-orange-300">
                    <Sparkles size={15} /> AI assistant
                  </span>
                  <button onClick={() => setAiOpen((v) => !v)} className="text-xs text-orange-600 hover:underline dark:text-orange-300">
                    {aiOpen ? 'Hide' : 'Show'} result
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => aiSummarize.mutate()} disabled={aiSummarize.isPending} className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50">
                    {aiSummarize.isPending ? 'Summarizing…' : 'Summarize task'}
                  </button>
                  <button onClick={() => aiEstimate.mutate()} disabled={aiEstimate.isPending} className="rounded-lg border border-orange-300 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-slate-700">
                    {aiEstimate.isPending ? 'Estimating…' : 'Estimate points'}
                  </button>
                  <button onClick={() => aiLabels.mutate()} disabled={aiLabels.isPending} className="rounded-lg border border-orange-300 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-slate-700">
                    {aiLabels.isPending ? 'Suggesting…' : 'Suggest labels'}
                  </button>
                </div>
                {aiOpen && aiResult && (
                  <div className="mt-3 rounded bg-white dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-200">
                    <p>{aiResult.summary}</p>
                    {aiResult.nextSteps.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {aiResult.nextSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              <section className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Comments ({detail.data?.comments.length ?? 0})
                </label>
                <div className="space-y-3">
                  {detail.data?.comments.map((c) => (
                    <div key={c._id} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Avatar name={c.author?.name ?? '?'} src={c.author?.avatar} size={20} />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.author?.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200">{c.body}</p>
                      {c.attachments.map((a) => (
                        <a key={a.publicId} href={a.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-orange-600 hover:underline">
                          <Paperclip size={12} /> {a.name}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Write a comment…"
                    className="w-full resize-none text-sm outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-orange-600">
                      <Paperclip size={13} />
                      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                      Attach
                    </label>
                    <button
                      onClick={() => comment.trim() && postComment.mutate({ body: comment, attachments: [] })}
                      disabled={!comment.trim() || postComment.isPending}
                      className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {postComment.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Comment
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Activity</label>
                <div className="space-y-2">
                  {detail.data?.activities.map((a) => (
                    <div key={a._id} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Avatar name={a.author?.name ?? '?'} src={a.author?.avatar} size={18} />
                      <span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{a.author?.name}</span> {a.message}
                      </span>
                      <span className="ml-auto shrink-0 text-slate-300">
                        {format(new Date(a.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-3">
          <button
            onClick={() => remove.mutate()}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} /> Delete task
          </button>
        </div>
      </div>
    </div>
  );
}

function LogTimeForm({ boardId, taskId, refresh }: { boardId: string; taskId: string; refresh: () => void }) {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState('');
  const log = useMutation({
    mutationFn: (m: number) => logTime(boardId, taskId, m),
    onSuccess: (res) => {
      toast.success(`Logged ${res.timeSpent ?? minutes} min total`);
      setMinutes('');
      refresh();
      queryClient.invalidateQueries({ queryKey: ['task', boardId, taskId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        placeholder="min"
        className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-orange-400"
      />
      <button
        onClick={() => {
          const m = Number(minutes);
          if (m > 0) log.mutate(m);
        }}
        disabled={!minutes || Number(minutes) <= 0 || log.isPending}
        className="flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {log.isPending ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
        Log
      </button>
    </div>
  );
}

function AddSubtaskForm({ task, update }: { task: Task; update: { mutate: (payload: Partial<Task>) => void } }) {
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return;
    const newItem = { _id: `sub-${Date.now().toString(36)}`, title: title.trim(), completed: false };
    update.mutate({
      subtasks: [...(task.subtasks ?? []), newItem],
    } as Partial<Task>);
    setTitle('');
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="+ add subtask"
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs outline-none focus:border-orange-400"
      />
      <button
        onClick={add}
        disabled={!title.trim()}
        className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/60 disabled:opacity-40"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}