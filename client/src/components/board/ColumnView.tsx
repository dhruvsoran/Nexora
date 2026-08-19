import { FormEvent, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Column, Task } from '../../api/types';
import { TaskCard } from './TaskCard';
import { cn } from '../../lib/utils';

interface Props {
  column: Column;
  tasks: Task[];
  isDraggingOver: boolean;
  onOpenTask: (id: string) => void;
  onCreateTask: (columnId: string, title: string) => void;
}

export function ColumnView({ column, tasks, isDraggingOver, onOpenTask, onCreateTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateTask(column.id, title.trim());
    setTitle('');
    setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-slate-50/80 transition dark:bg-slate-900/70',
        isOver || isDraggingOver
          ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/40'
          : 'border-slate-200 dark:border-slate-800'
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200/70 px-3 py-2.5 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: column.color }}
          >
            {tasks.length}
          </span>
          <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{column.name}</span>
          {totalPoints > 0 && (
            <span className="hidden rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 xl:inline dark:bg-slate-700 dark:text-slate-300">
              {totalPoints} pts
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          title={`Add task to ${column.name}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 pt-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-xl border border-dashed border-slate-300 py-6 text-sm text-slate-500 transition hover:border-orange-400 hover:bg-white/60 hover:text-orange-500 dark:text-slate-400 dark:hover:border-orange-500 dark:hover:bg-slate-800/50"
          >
            Add the first task
          </button>
        )}
        {adding && (
          <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 focus:border-orange-400 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <button type="button" onClick={() => setAdding(false)} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button type="submit" className="rounded bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800">
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}