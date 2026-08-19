import { api } from './client';

export interface BoardSummary {
  summary: string;
  highlights: string[];
  risks: string[];
}

export interface TaskSummary {
  summary: string;
  nextSteps: string[];
}

export interface Estimation {
  storyPoints: number;
  reason: string;
}

export function summarizeBoard(boardId: string): Promise<BoardSummary> {
  return api.get<{ data: BoardSummary }>(`/boards/${boardId}/ai/summary`).then((r) => r.data.data);
}

export function summarizeTask(boardId: string, taskId: string): Promise<TaskSummary> {
  return api
    .get<{ data: TaskSummary }>(`/boards/${boardId}/tasks/${taskId}/ai/summary`)
    .then((r) => r.data.data);
}

export function estimateTask(boardId: string, title: string, description?: string): Promise<Estimation> {
  return api
    .post<{ data: Estimation }>(`/boards/${boardId}/ai/estimate`, { title, description })
    .then((r) => r.data.data);
}

export function suggestLabels(boardId: string, title: string, description?: string): Promise<string[]> {
  return api
    .post<{ data: { labels: string[] } }>(`/boards/${boardId}/ai/labels`, { title, description })
    .then((r) => r.data.data.labels);
}

export interface GeneratedTask {
  id: string;
  title: string;
}

export function generateTasks(boardId: string, prompt: string): Promise<GeneratedTask[]> {
  return api
    .post<{ data: { tasks: GeneratedTask[] } }>(`/boards/${boardId}/ai/generate`, { prompt })
    .then((r) => r.data.data.tasks);
}

export interface PrioritizedTask {
  id: string;
  reason: string;
}

export function prioritizeTasks(boardId: string): Promise<PrioritizedTask[]> {
  return api
    .post<{ data: { tasks: PrioritizedTask[] } }>(`/boards/${boardId}/ai/prioritize`)
    .then((r) => r.data.data.tasks);
}

export interface RiskItem {
  id: string;
  level: string;
  reason: string;
  suggestion: string;
}

export function detectRisks(boardId: string): Promise<RiskItem[]> {
  return api.post<{ data: { risks: RiskItem[] } }>(`/boards/${boardId}/ai/risks`).then((r) => r.data.data.risks);
}

export interface WeeklyReport {
  summary: string;
  highlights: string[];
  metrics: { created: number; completed: number; activity: number };
  focusAreas: string[];
  nextWeek: string;
}

export function weeklyReport(workspaceId: string): Promise<WeeklyReport> {
  return api.get<{ data: WeeklyReport }>(`/workspaces/${workspaceId}/ai/report`).then((r) => r.data.data);
}