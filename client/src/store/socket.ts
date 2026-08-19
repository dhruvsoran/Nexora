import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;
  const token = useAuthStore.getState().accessToken;
  socket = io('/', {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function joinBoardRoom(boardId: string): void {
  socket?.emit('board:join', boardId);
}

export function leaveBoardRoom(boardId: string): void {
  socket?.emit('board:leave', boardId);
}

export function joinChannelRoom(channelId: string): void {
  socket?.emit('channel:join', channelId);
}

export function leaveChannelRoom(channelId: string): void {
  socket?.emit('channel:leave', channelId);
}

export function sendTyping(channelId: string, isTyping: boolean): void {
  socket?.emit('typing', { channelId, isTyping });
}