import { Server } from 'socket.io';

let _io: Server | null = null;

export function setIO(io: Server) {
  _io = io;
}

export function getIO(): Server | null {
  return _io;
}

export function boardRoom(boardId: string) {
  return `board:${boardId}`;
}

export function workspaceRoom(workspaceId: string) {
  return `ws:${workspaceId}`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}