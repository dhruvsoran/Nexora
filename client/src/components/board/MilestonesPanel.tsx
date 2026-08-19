import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flag, Plus, Trash2, X } from 'lucide-react';
import { Board } from '../../api/types';
import { createMilestone, deleteMilestone } from '../../api/boards';
import { errorMessage } from '../../api/client';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export function MilestonesPanel({ board, onOpenTask }: { board: Board; onOpenTask: (taskId: string) => void }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['board', board.id] });

  const create = useMutation({
    mutationFn: () => createMilestone(board.id, { name, dueDate: dueDate ? new Date(dueDate).toISOString() : null }),
    onSuccess: () => {
      toast.success('Milestone created');
      setCreating(false);
      setName('');
      setDueDate('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMilestone(id),
    onSuccess: () => {
      toast.success('Milestone deleted');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const milestones = board.milestones ?? [];
  const tasksByMilestone = new Map<string, { total: number; done: number }>();
  for (const t of board.tasks) {
    const m = t.milestone?._id;
    if (!m) continue;
    const cur = tasksByMilestone.get(m) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (t.completedAt) cur.done += 1;
    tasksByMilestone.set(m, cur);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Flag size={15} className="text-orange-500" /> Milestones
        </h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800"
          >
            <Plus size={13} /> New
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4 space-y-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-900/60 dark:bg-orange-950/30">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Milestone name (e.g. Sprint 12)"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
            />
            <button
              onClick={() => name.trim() && create.mutate()}
              disabled={!name.trim() || create.isPending}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="rounded p-1 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {milestones.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
            No milestones yet. Group tasks around releases or sprints.
          </p>
        )}
        {milestones.map((m) => {
          const stats = tasksByMilestone.get(m._id) ?? { total: 0, done: 0 };
          const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
          const tasks = board.tasks.filter((t) => t.milestone?._id === m._id);
          return (
            <div key={m._id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.name}</span>
                  {m.dueDate && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {format(new Date(m.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => remove.mutate(m._id)}
                  className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {stats.done}/{stats.total} tasks · {pct}%
              </p>
              <div className="flex flex-wrap gap-1">
                {tasks.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpenTask(t.id)}
                    className={cn(
                      'max-w-40 truncate rounded px-2 py-0.5 text-[11px]',
                      t.completedAt ? 'bg-orange-50 text-orange-700 line-through dark:bg-orange-950/40 dark:text-orange-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    )}
                  >
                    {t.title}
                  </button>
                ))}
                {tasks.length > 6 && (
                  <span className="rounded bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    +{tasks.length - 6} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
