import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Sparkles, AlertTriangle, Clock, CheckCircle2, Layers, CalendarRange, ChevronDown, FolderKanban } from 'lucide-react';
import { getBoard } from '../api/boards';
import { getBoardStats, getBurndown, getWorkspaceActivity } from '../api/analytics';
import { getWorkspace } from '../api/workspaces';
import { summarizeBoard, weeklyReport } from '../api/ai';
import { usePresence } from '../hooks/usePresence';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { BurndownChart } from '../components/dashboard/BurndownChart';

export function DashboardPage() {
  const { workspaceId = '', boardId: boardParam = '' } = useParams();

  const workspace = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const [boardId, setBoardId] = useState(boardParam);

  useEffect(() => {
    const boards = workspace.data?.boards;
    if (!boards?.length) return;
    setBoardId((cur) => (cur && boards.some((b) => b.id === cur) ? cur : boards[0].id));
  }, [workspace.data]);

  const activeId = boardId && workspace.data?.boards?.some((b) => b.id === boardId) ? boardId : workspace.data?.boards?.[0]?.id ?? '';

  const board = useQuery({
    queryKey: ['board', activeId],
    queryFn: () => getBoard(activeId),
    enabled: Boolean(activeId),
  });

  const stats = useQuery({
    queryKey: ['stats', activeId],
    queryFn: () => getBoardStats(activeId),
    enabled: Boolean(activeId),
  });

  const burndown = useQuery({
    queryKey: ['burndown', activeId],
    queryFn: () => getBurndown(activeId, 14),
    enabled: Boolean(activeId),
  });

  const ai = useQuery({
    queryKey: ['ai-summary', activeId],
    queryFn: () => summarizeBoard(activeId),
    enabled: Boolean(activeId),
  });

  const activity = useQuery({
    queryKey: ['activity', workspaceId],
    queryFn: () => getWorkspaceActivity(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const report = useQuery({
    queryKey: ['weekly-report', workspaceId],
    queryFn: () => weeklyReport(workspaceId),
    enabled: Boolean(workspaceId),
    retry: false,
  });

  const { onlineIds } = usePresence(workspaceId);

  const boards = workspace.data?.boards ?? [];
  const activeBoard = board.data;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              {workspace.data?.logo && <span className="mr-2">{workspace.data.logo}</span>}
              Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {workspace.data?.name}
              {activeBoard && <> · {activeBoard.name}</>}
            </p>
          </div>
          {boards.length > 0 && (
            <div className="relative">
              <select
                value={activeId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-orange-400 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>

        {boards.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-800">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-orange-400/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-2xl" />
            <div className="relative">
              <div className="animate-gradient mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-teal-500 to-orange-400 text-white shadow-lg shadow-teal-800/25">
                <FolderKanban size={28} />
              </div>
              <h2 className="text-lg font-semibold">No boards yet</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Create a board from the sidebar to start tracking tasks, milestones and AI insights here.
              </p>
            </div>
          </div>
        ) : activeId && board.isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard icon={<Layers size={18} />} label="Total tasks" value={stats.data?.total ?? 0} color="bg-teal-700" />
              <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={stats.data?.completed ?? 0} color="bg-teal-600" />
              <StatCard icon={<Clock size={18} />} label="Due soon (3d)" value={stats.data?.dueSoon ?? 0} color="bg-orange-500" />
            </div>

            {report.data && (
              <div className="mb-6 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-orange-50/60 p-5 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-orange-950/40">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-800 dark:text-teal-200">
                  <CalendarRange size={15} /> Weekly AI report
                </h2>
                <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">{report.data.summary}</p>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-600 dark:text-slate-300">
                    <b>{report.data.metrics.created}</b> created
                  </span>
                  <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-600 dark:text-slate-300">
                    <b>{report.data.metrics.completed}</b> completed
                  </span>
                  <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-600 dark:text-slate-300">
                    <b>{report.data.metrics.activity}</b> activity events
                  </span>
                </div>
                {report.data.highlights.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase text-orange-700 dark:text-orange-400">Highlights</p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                        {report.data.highlights.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    </div>
                    {report.data.focusAreas.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase text-orange-700 dark:text-orange-400">Focus areas</p>
                        <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                          {report.data.focusAreas.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                        {report.data.nextWeek && (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-teal-700 dark:text-teal-300">Next week: </span>
                            {report.data.nextWeek}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {report.isError && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-2.5 text-xs text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300">
                <AlertTriangle size={13} /> Weekly report needs Gemini enabled on the Business plan.
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 lg:col-span-2">
                <h2 className="mb-4 text-sm font-semibold">Burndown (last 14 days)</h2>
                {burndown.data ? (
                  <BurndownChart points={burndown.data} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No data yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-5 dark:border-orange-900/60 dark:bg-orange-950/30">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                  <Sparkles size={15} /> AI board summary
                </h2>
                {ai.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Generating with Gemini…</p>}
                {ai.isError && <p className="text-sm text-slate-500 dark:text-slate-400">Configure GEMINI_API_KEY to enable.</p>}
                {ai.data && (
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    <p className="mb-2">{ai.data.summary}</p>
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Highlights</p>
                    <ul className="mb-3 list-inside list-disc space-y-1 text-xs">
                      {ai.data.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    {ai.data.risks.length > 0 && (
                      <>
                        <p className="mb-1 text-xs font-semibold uppercase text-red-400">Risks</p>
                        <ul className="list-inside list-disc space-y-1 text-xs text-red-600">
                          {ai.data.risks.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <h2 className="mb-3 text-sm font-semibold">Team workload</h2>
                {stats.data && stats.data.workload.length > 0 ? (
                  <ul className="space-y-2.5">
                    {stats.data.workload.map((w) => (
                      <li key={w.id} className="flex items-center gap-2 text-sm">
                        <Avatar name={w.name} size={24} />
                        <span className="flex-1 truncate">{w.name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {w.count} tasks · {w.points} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No tasks assigned.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <h2 className="mb-3 text-sm font-semibold">Online now</h2>
                {workspace.data?.members.length ? (
                  <ul className="space-y-2.5">
                    {workspace.data.members.map((m) => (
                      <li key={m.user} className="flex items-center gap-2 text-sm">
                        <div className="relative">
                          <Avatar name={m.profile?.name ?? '?'} src={m.profile?.avatar} size={26} />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                              onlineIds.has(m.user) ? 'bg-teal-600' : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <span className="flex-1 truncate">{m.profile?.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{onlineIds.has(m.user) ? 'online' : 'offline'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading members…</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
                <ul className="space-y-3">
                  {activity.data?.slice(0, 10).map((a) => (
                    <li key={a._id} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Avatar name={a.author?.name ?? '?'} src={a.author?.avatar} size={22} />
                      <div className="min-w-0">
                        <p>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{a.author?.name}</span> {a.message}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{format(new Date(a.createdAt), 'MMM d, HH:mm')}</p>
                      </div>
                    </li>
                  ))}
                  {activity.data?.length === 0 && <li className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</li>}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className={`mb-3 inline-flex rounded-lg p-2 text-white ${color}`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Skeleton className="mb-3 h-9 w-9" />
            <Skeleton className="mb-2 h-7 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="h-44 w-full" />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton className="mb-3 h-4 w-36" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="mb-2 h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </SkeletonCard>
      </div>
    </>
  );
}
