import { api } from './client';
import { BoardStats, BurndownPoint, ActivityItem } from './types';

export function getBoardStats(boardId: string): Promise<BoardStats> {
  return api.get<{ data: BoardStats }>(`/boards/${boardId}/stats`).then((r) => r.data.data);
}

export function getBurndown(boardId: string, days = 14): Promise<BurndownPoint[]> {
  return api
    .get<{ data: { series: BurndownPoint[] } }>(`/boards/${boardId}/burndown`, { params: { days } })
    .then((r) => r.data.data.series);
}

export function getWorkspaceActivity(workspaceId: string): Promise<ActivityItem[]> {
  return api.get<{ data: ActivityItem[] }>(`/workspaces/${workspaceId}/activity`).then((r) => r.data.data);
}