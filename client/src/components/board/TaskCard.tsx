import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { CalendarDays, Paperclip, Mic, CheckCircle2 } from 'lucide-react';
import { Task } from '../../api/types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

const priorityStyle: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  medium: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const priorityBar: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-teal-500',
  low: 'bg-slate-400',
};

export function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const done = Boolean(task.completedAt);
  const overdue = isOverdue(task);
  const subsDone = task.subtasks.filter((s) => s.completed).length;
  const subsTotal = task.subtasks.length;
  const subsPct = subsTotal > 0 ? Math.round((subsDone / subsTotal) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg hover:shadow-teal-700/10 dark:border-slate-700/70 dark:bg-slate-800 dark:hover:border-orange-500',
        isDragging && 'z-10 rotate-2 opacity-80 shadow-xl'
      )}
      {...attributes}
      {...listeners}
      onClick={onOpen}
    >
      <span className={cn('absolute inset-x-0 top-0 h-0.5', priorityBar[task.priority])} aria-hidden="true" />

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', priorityStyle[task.priority])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {task.priority}
        </span>
        <div className="flex items-center gap-1">
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              <CheckCircle2 size={12} /> Done
            </span>
          )}
          {task.storyPoints > 0 && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              {task.storyPoints} pts
            </span>
          )}
        </div>
      </div>

      <p className={cn('text-sm font-medium text-slate-800 dark:text-slate-100', done && 'text-slate-400 line-through dark:text-slate-500')}>
        {task.title}
      </p>

      {task.milestone && (
        <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.milestone.color }} />
          <span className="truncate">{task.milestone.name}</span>
        </span>
      )}

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {label}
            </span>
          ))}
        </div>
      )}

      {subsTotal > 0 && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Subtasks</span>
            <span className="font-semibold">
              {subsDone}/{subsTotal}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r from-teal-600 to-orange-400 transition-all', subsPct === 100 && 'from-teal-600 to-teal-500')}
              style={{ width: `${subsPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px]',
                overdue && !done
                  ? 'bg-red-50 font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-300'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <CalendarDays size={12} />
              {format(new Date(task.dueDate), 'MMM d')}
              {overdue && !done && ' · overdue'}
            </span>
          )}
          {task.attachmentsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Paperclip size={12} /> {task.attachmentsCount}
            </span>
          )}
          {(task.voiceNotes?.length ?? 0) > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-800"
              title="Has voice notes"
            >
              <Mic size={11} /> {task.voiceNotes!.length}
            </span>
          )}
        </div>
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} name={a.name} src={a.avatar} size={22} />
          ))}
          {task.assignees.length > 3 && (
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-600 dark:text-slate-200 dark:ring-slate-800">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.completedAt) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}