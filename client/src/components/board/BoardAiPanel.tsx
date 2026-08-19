import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Wand2, AlertTriangle, SlidersHorizontal, Loader2, X } from 'lucide-react';
import { generateTasks, prioritizeTasks, detectRisks, RiskItem } from '../../api/ai';
import { errorMessage } from '../../api/client';
import { cn } from '../../lib/utils';

export function BoardAiPanel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [risks, setRisks] = useState<RiskItem[] | null>(null);
  const [priorities, setPriorities] = useState<Array<{ id: string; reason: string }> | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['board', id] });

  const generate = useMutation({
    mutationFn: (p: string) => generateTasks(id, p),
    onSuccess: (tasks) => {
      toast.success(`Generated ${tasks.length} tasks`);
      setPrompt('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const prioritize = useMutation({
    mutationFn: () => prioritizeTasks(id),
    onSuccess: (res) => {
      setPriorities(res);
      toast.success('Priorities updated');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const detect = useMutation({
    mutationFn: () => detectRisks(id),
    onSuccess: setRisks,
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Sparkles size={15} className="text-orange-500" /> AI assistant
      </h2>

      <div className="mb-4 rounded-lg border border-orange-100 bg-orange-50/60 p-3 dark:border-orange-900/60 dark:bg-orange-950/30">
        <p className="mb-2 text-xs font-medium text-orange-700 dark:text-orange-300">Generate tasks from a description</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Build the onboarding flow: sign up, email verification, welcome tour…"
          className="w-full resize-none rounded-lg border border-orange-200 bg-white dark:bg-slate-800 px-2.5 py-2 text-sm outline-none focus:border-orange-400"
        />
        <button
          onClick={() => prompt.trim() && generate.mutate(prompt)}
          disabled={!prompt.trim() || generate.isPending}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          {generate.isPending ? 'Generating…' : 'Generate tasks'}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => prioritize.mutate()}
          disabled={prioritize.isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800/60 disabled:opacity-50"
        >
          {prioritize.isPending ? <Loader2 size={13} className="animate-spin" /> : <SlidersHorizontal size={13} />}
          Prioritize tasks
        </button>
        <button
          onClick={() => detect.mutate()}
          disabled={detect.isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/70"
        >
          {detect.isPending ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
          Detect risks
        </button>
      </div>

      {priorities && priorities.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Updated priorities</span>
            <button onClick={() => setPriorities(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300">
              <X size={13} />
            </button>
          </div>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto p-2.5">
            {priorities.map((p) => (
              <li key={p.id} className="text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-mono text-slate-500 dark:text-slate-400">{p.id.slice(-5).toUpperCase()}</span> — {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {risks && (
        <div className="flex-1 space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Risk analysis</span>
            <button onClick={() => setRisks(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300">
              <X size={13} />
            </button>
          </div>
          {risks.length === 0 && (
            <p className="rounded-lg border border-orange-100 bg-orange-50 p-3 text-xs text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
              No delivery risks detected.
            </p>
          )}
          {risks.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                    r.level === 'high'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                      : r.level === 'medium'
                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                  )}
                >
                  {r.level}
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{r.id.slice(-5).toUpperCase()}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{r.reason}</p>
              {r.suggestion && <p className="mt-1 text-[11px] text-orange-600 dark:text-orange-300">→ {r.suggestion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}