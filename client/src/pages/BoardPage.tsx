import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import { getBoard } from '../api/boards';
import { moveTask, createTask } from '../api/boards';
import { errorMessage } from '../api/client';
import { joinBoardRoom, leaveBoardRoom, getSocket } from '../store/socket';
import { Board, Column, Task } from '../api/types';
import { ColumnView } from '../components/board/ColumnView';
import { TaskDrawer } from '../components/board/TaskDrawer';
import { MilestonesPanel } from '../components/board/MilestonesPanel';
import { BoardAiPanel } from '../components/board/BoardAiPanel';
import { Skeleton } from '../components/ui/Skeleton';
import { Flag, Sparkles, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function BoardPage() {
  const { boardId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [panel, setPanel] = useState<'milestones' | 'ai' | null>('milestones');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const board = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId),
    enabled: Boolean(boardId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    joinBoardRoom(boardId);
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    socket.on('task:moved', refresh);
    socket.on('task:deleted', refresh);
    socket.on('comment:created', refresh);
    socket.on('comment:deleted', refresh);
    return () => {
      leaveBoardRoom(boardId);
      socket.off('task:created', refresh);
      socket.off('task:updated', refresh);
      socket.off('task:moved', refresh);
      socket.off('task:deleted', refresh);
      socket.off('comment:created', refresh);
      socket.off('comment:deleted', refresh);
    };
  }, [boardId, queryClient]);

  const persistMove = useMutation({
    mutationFn: ({ taskId, columnId, order }: { taskId: string; columnId: string; order: number }) =>
      moveTask(boardId, taskId, columnId, order),
    onError: (e) => {
      toast.error(errorMessage(e));
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const quickCreate = useMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
      createTask(boardId, { title, columnId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragOverColumn(null);
      const { active, over } = event;
      if (!over) return;
      const data = board.data;
      if (!data) return;

      const taskId = String(active.id);
      const task = data.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const isOverColumn = data.columns.some((c) => c.id === String(over.id));
      const targetColumnId = isOverColumn
        ? String(over.id)
        : (data.columns.find((c) => c.id === String(over.id))?.id ??
          data.tasks.find((t) => t.id === String(over.id))?.columnId);
      if (!targetColumnId) return;

      const targetTaskId = isOverColumn ? null : String(over.id);

      const tasksInTarget = data.tasks
        .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      let targetIndex = tasksInTarget.length;
      if (targetTaskId) {
        const idx = tasksInTarget.findIndex((t) => t.id === targetTaskId);
        if (idx !== -1) targetIndex = idx;
      }

      // Rebuild a stable order for every column
      const byColumn = new Map<string, Task[]>();
      for (const col of data.columns) {
        byColumn.set(
          col.id,
          data.tasks.filter((t) => t.columnId === col.id && t.id !== taskId).sort((a, b) => a.order - b.order)
        );
      }
      const targetList = byColumn.get(targetColumnId) ?? [];
      targetList.splice(Math.min(targetIndex, targetList.length), 0, { ...task, columnId: targetColumnId });

      const updatedTasks: Task[] = [];
      for (const [colId, list] of byColumn.entries()) {
        list.forEach((t, i) => updatedTasks.push({ ...t, order: i, columnId: colId }));
      }

      queryClient.setQueryData(['board', boardId], (old: Board | undefined) =>
        old ? { ...old, tasks: updatedTasks } : old
      );

      persistMove.mutate({ taskId, columnId: targetColumnId, order: targetIndex });
    },
    [board.data, boardId, persistMove, queryClient]
  );

  if (board.isLoading) return <BoardSkeleton />;
  if (board.isError || !board.data) {
    return <div className="p-8 text-red-600 text-sm">{errorMessage(board.error)}</div>;
  }

  const data = board.data;
  const openTask = data.tasks.find((t) => t.id === openTaskId) ?? null;

  return (
    <div className="flex h-full flex-col bg-transparent dark:bg-slate-900/40">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
          <h1 className="font-semibold">{data.name}</h1>
          <span className="rounded bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{data.key}</span>
          <button
            onClick={() => navigate(`/workspaces/${data.workspace}/chat`)}
            className="ml-2 text-sm text-orange-600 hover:underline dark:text-orange-300"
          >
            Open chat
          </button>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{data.tasks.length} tasks</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <div className="absolute right-3 top-3 z-10 flex gap-1.5">
            <button
              onClick={() => setPanel(panel === 'milestones' ? null : 'milestones')}
              className={cn(
                'rounded-lg border bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium shadow-sm',
                panel === 'milestones' ? 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
              )}
            >
              <span className="flex items-center gap-1.5">
                {panel === 'milestones' ? <X size={13} /> : <Flag size={13} />}
                Milestones
              </span>
            </button>
            <button
              onClick={() => setPanel(panel === 'ai' ? null : 'ai')}
              className={cn(
                'rounded-lg border bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium shadow-sm',
                panel === 'ai' ? 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
              )}
            >
              <span className="flex items-center gap-1.5">
                {panel === 'ai' ? <X size={13} /> : <Sparkles size={13} />}
                AI
              </span>
            </button>
          </div>
          <div className="h-full overflow-x-auto overflow-y-hidden p-4 pt-14 sm:p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                const over = e.over;
                if (!over) return;
                const overCol = data.columns.find((c) => c.id === String(over.id));
                if (overCol) setDragOverColumn(overCol.id);
                else {
                  const t = data.tasks.find((x) => x.id === String(over.id));
                  if (t) setDragOverColumn(t.columnId);
                }
              }}
              onDragStart={() => setDragOverColumn(null)}
            >
              <div className="flex h-full items-start gap-4">
                {data.columns.map((col: Column) => (
                  <ColumnView
                    key={col.id}
                    column={col}
                    tasks={data.tasks
                      .filter((t) => t.columnId === col.id)
                      .sort((a, b) => a.order - b.order)}
                    isDraggingOver={dragOverColumn === col.id}
                    onOpenTask={(id) => setOpenTaskId(id)}
                    onCreateTask={(columnId, title) => quickCreate.mutate({ columnId, title })}
                  />
                ))}
              </div>
            </DndContext>
          </div>
        </div>

        {panel && (
          <aside className="fixed inset-y-0 right-0 z-30 w-[85%] max-w-sm shrink-0 border-l border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 lg:static lg:w-80 lg:max-w-none lg:shadow-none">
            <div className="mb-2 flex justify-end lg:hidden">
              <button
                onClick={() => setPanel(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Close panel"
              >
                <X size={16} />
              </button>
            </div>
            {panel === 'milestones' ? (
              <MilestonesPanel board={data} onOpenTask={(id) => setOpenTaskId(id)} />
            ) : (
              <BoardAiPanel id={data.id} />
            )}
          </aside>
        )}
      </div>

      {openTask && (
        <TaskDrawer board={data} task={openTask} onClose={() => setOpenTaskId(null)} />
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-10" />
      </div>
      <div className="flex flex-1 items-start gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-64 shrink-0 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}