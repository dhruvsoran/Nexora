import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Workspace, MemberDoc } from '../models/Workspace.js';
import { Board } from '../models/Board.js';
import { Channel, ChannelType } from '../models/Channel.js';
import { verifyAccessToken } from '../services/token.js';
import { setIO, boardRoom, workspaceRoom, userRoom } from '../services/socketService.js';
import { getRedis, cacheKey } from '../config/redis.js';
import { isMember } from '../services/membership.js';
import { config } from '../config/index.js';

type PresenceEntry = { userId: string; socketId: string };

function presenceKey(workspaceId: string) {
  return cacheKey('presence', workspaceId);
}

function onlineKey(userId: string) {
  return cacheKey('online', userId);
}

export function setupSocket(io: Server): void {
  setIO(io);

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.workspaces = new Set<string>();
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) next(new Error('Token expired'));
      else next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId: string = socket.data.userId;

    try {
      const workspaces = await Workspace.find({ 'members.user': userId }).select('_id').lean();
      for (const ws of workspaces) {
        const wsId = String(ws._id);
        socket.data.workspaces.add(wsId);
        socket.join(workspaceRoom(wsId));
        await getRedis().sadd(presenceKey(wsId), userId).catch(() => undefined);
        io.to(workspaceRoom(wsId)).emit('presence:update', { workspaceId: wsId, userId, online: true });
      }
    } catch {
      // presence is best-effort; connection still works
    }

    socket.on('channel:join', async (channelId: string) => {
      if (typeof channelId !== 'string') return;
      const allowed = await canJoinChannel(channelId, userId);
      if (allowed) socket.join(`channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId: string) => {
      if (typeof channelId === 'string') socket.leave(`channel:${channelId}`);
    });

    socket.on('board:join', async (boardId: string) => {
      if (typeof boardId !== 'string') return;
      const allowed = await canJoinBoard(boardId, userId);
      if (allowed) socket.join(boardRoom(boardId));
    });

    socket.on('board:leave', (boardId: string) => {
      if (typeof boardId === 'string') socket.leave(boardRoom(boardId));
    });

    socket.on('typing', (data: { channelId?: string; isTyping?: boolean }) => {
      if (!data?.channelId) return;
      socket.to(`channel:${data.channelId}`).emit('typing', {
        channelId: data.channelId,
        userId,
        isTyping: Boolean(data.isTyping),
      });
    });

    socket.on('disconnect', async () => {
      for (const wsId of socket.data.workspaces ?? []) {
        await getRedis().srem(presenceKey(wsId), userId).catch(() => undefined);
        io.to(workspaceRoom(wsId)).emit('presence:update', { workspaceId: wsId, userId, online: false });
      }
    });
  });
}

export async function getOnlineUserIds(workspaceId: string): Promise<Set<string>> {
  try {
    const members = await getRedis().smembers(presenceKey(workspaceId));
    return new Set(members);
  } catch {
    return new Set();
  }
}

export { userRoom };

export async function canJoinChannel(channelId: string, userId: string): Promise<boolean> {
  try {
    const channel = await Channel.findById(channelId).select('workspace type members');
    if (!channel) return false;
    if (channel.type === ChannelType.DIRECT && !(channel.members ?? []).some((m) => String(m) === String(userId))) {
      return false;
    }
    const ws = await Workspace.findById(channel.workspace).select('members');
    if (!ws) return false;
    return isMember(ws.members as unknown as MemberDoc[], userId);
  } catch {
    return false;
  }
}

export async function canJoinBoard(boardId: string, userId: string): Promise<boolean> {
  try {
    const board = await Board.findById(boardId).select('workspace');
    if (!board) return false;
    const ws = await Workspace.findById(board.workspace).select('members');
    if (!ws) return false;
    return isMember(ws.members as unknown as MemberDoc[], userId);
  } catch {
    return false;
  }
}

export function isConfiguredForRedis() {
  return Boolean(config.redisUrl);
}