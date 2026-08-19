import { api } from './client';
import { Board, Task, TaskDetail, Milestone } from './types';

export function createBoardIn(workspaceId: string, payload: { name: string; key: string; description?: string }) {
  return api
    .post<{ data: { board: Board } }>(`/workspaces/${workspaceId}/boards`, payload)
    .then((r) => r.data.data.board);
}

export function getBoard(id: string): Promise<Board> {
  return api.get<{ data: Board }>(`/boards/${id}`).then((r) => r.data.data);
}

export function updateBoard(
  id: string,
  payload: Partial<{ name: string; description: string; color: string; columns: unknown[] }>
) {
  return api.patch<{ data: { board: Board } }>(`/boards/${id}`, payload).then((r) => r.data.data.board);
}

export function archiveBoard(id: string) {
  return api.delete(`/boards/${id}`);
}

export function createTask(boardId: string, payload: Partial<Task> & { title: string }) {
  return api.post<{ data: { task: Task } }>(`/boards/${boardId}/tasks`, payload).then((r) => r.data.data.task);
}

export function getTaskDetail(boardId: string, taskId: string): Promise<TaskDetail> {
  return api.get<{ data: TaskDetail }>(`/boards/${boardId}/tasks/${taskId}`).then((r) => r.data.data);
}

export function updateTask(boardId: string, taskId: string, payload: Partial<Task>) {
  return api.patch<{ data: { task: Task } }>(`/boards/${boardId}/tasks/${taskId}`, payload).then((r) => r.data.data.task);
}

export function moveTask(boardId: string, taskId: string, columnId: string, targetOrder: number) {
  return api
    .post<{ data: { task: Task } }>(`/boards/${boardId}/tasks/${taskId}/move`, { columnId, targetOrder })
    .then((r) => r.data.data.task);
}

export function deleteTask(boardId: string, taskId: string) {
  return api.delete(`/boards/${boardId}/tasks/${taskId}`);
}

export function addComment(boardId: string, taskId: string, body: string, attachments: unknown[] = []) {
  return api.post(`/boards/${boardId}/tasks/${taskId}/comments`, { body, attachments });
}

export function deleteComment(boardId: string, commentId: string) {
  return api.delete(`/boards/${boardId}/comments/${commentId}`);
}

export function logTime(boardId: string, taskId: string, minutes: number) {
  return api.post(`/boards/${boardId}/tasks/${taskId}/time`, { minutes }).then((r) => r.data.data);
}

export function attachFile(boardId: string, taskId: string, attachment: { publicId: string; url: string; name?: string; size?: number }) {
  return api
    .post<{ data: { task: Task } }>(`/boards/${boardId}/tasks/${taskId}/attachments`, { attachment })
    .then((r) => r.data.data.task);
}

export function attachVoiceNote(
  boardId: string,
  taskId: string,
  payload: { attachment: { publicId: string; url: string; name?: string }; durationMs: number; mime: string }
) {
  return api
    .post<{ data: { note: unknown } }>(`/boards/${boardId}/tasks/${taskId}/voicenotes`, payload)
    .then((r) => r.data.data.note);
}

export function deleteVoiceNote(boardId: string, taskId: string, noteId: string) {
  return api.delete(`/boards/${boardId}/tasks/${taskId}/voicenotes/${noteId}`);
}

export function listMilestones(boardId: string): Promise<Milestone[]> {
  return api.get<{ data: Milestone[] }>(`/boards/${boardId}/milestones`).then((r) => r.data.data);
}

export function createMilestone(
  boardId: string,
  payload: { name: string; description?: string; color?: string; dueDate?: string | null }
): Promise<Milestone> {
  return api.post<{ data: Milestone }>(`/boards/${boardId}/milestones`, payload).then((r) => r.data.data);
}

export function updateMilestone(id: string, payload: Partial<{ name: string; description: string; color: string; dueDate: string | null }>) {
  return api.patch<{ data: Milestone }>(`/milestones/${id}`, payload).then((r) => r.data.data);
}

export function deleteMilestone(id: string) {
  return api.delete(`/milestones/${id}`);
}