import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Channel, ChannelType } from '../models/Channel.js';
import { Message } from '../models/Message.js';
import { Workspace, MemberDoc } from '../models/Workspace.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthRequest } from '../middleware/auth.js';
import { isMember, requireRole, CAN_MANAGE } from '../services/membership.js';
import { getIO, workspaceRoom, userRoom } from '../services/socketService.js';
import { getRedis, cacheKey } from '../config/redis.js';
import { getOnlineUserIds } from '../socket/index.js';

async function loadWs(workspaceId: string, userId: string) {
  if (!Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('Invalid workspace id');
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw ApiError.notFound('Workspace not found');
  if (!isMember(ws.members as unknown as MemberDoc[], String(userId))) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }
  return ws;
}

export async function getChannels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    await loadWs(workspaceId, String(req.user!._id));

    const channels = await Channel.find({
      workspace: workspaceId,
      $or: [{ type: ChannelType.CHANNEL }, { members: req.user!._id }],
    })
      .populate('members', 'name email avatar')
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json({ success: true, data: channels });
  } catch (err) {
    next(err);
  }
}

export async function createChannel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    if (!name) throw ApiError.badRequest('Channel name is required');

    const ws = await loadWs(workspaceId, String(req.user!._id));
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const slug = String(name).toLowerCase().replace(/\s+/g, '-');
    const channel = await Channel.create({
      workspace: ws._id,
      name: slug,
      description: description ?? '',
      type: ChannelType.CHANNEL,
      createdBy: req.user!._id,
      members: [req.user!._id],
    });

    const io = getIO();
    if (io) io.to(workspaceRoom(String(ws._id))).emit('channel:created', channel);
    res.status(201).json({ success: true, data: { channel } });
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateDM(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) throw ApiError.badRequest('Invalid user id');
    const ws = await loadWs(workspaceId, String(req.user!._id));

    if (!isMember(ws.members as unknown as MemberDoc[], userId)) {
      throw ApiError.badRequest('That user is not a member of this workspace');
    }

    let dm = await Channel.findOne({
      workspace: ws._id,
      type: ChannelType.DIRECT,
      members: { $all: [req.user!._id, new Types.ObjectId(userId)] },
    });

    if (!dm) {
      dm = await Channel.create({
        workspace: ws._id,
        type: ChannelType.DIRECT,
        members: [req.user!._id, new Types.ObjectId(userId)],
        createdBy: req.user!._id,
      });
    }

    const populated = await Channel.findById(dm._id).populate('members', 'name email avatar');
    res.status(201).json({ success: true, data: { channel: populated } });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, channelId } = req.params;
    await loadWs(workspaceId, String(req.user!._id));

    const channel = await Channel.findOne({ _id: channelId, workspace: workspaceId });
    if (!channel) throw ApiError.notFound('Channel not found');
    if (channel.type === ChannelType.DIRECT && !channel.members.some((m) => String(m) === String(req.user!._id))) {
      throw ApiError.forbidden();
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(String(req.query.before)) : new Date();

    const messages = await Message.find({ channel: channel._id, createdAt: { $lt: before } })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {  try {
    const { workspaceId, channelId } = req.params;
    const { body, attachments } = req.body;
    if (!body && (!attachments || !attachments.length)) {
      throw ApiError.badRequest('Message body is required');
    }
    await loadWs(workspaceId, String(req.user!._id));

    const channel = await Channel.findOne({ _id: channelId, workspace: workspaceId });
    if (!channel) throw ApiError.notFound('Channel not found');
    if (channel.type === ChannelType.DIRECT && !channel.members.some((m) => String(m) === String(req.user!._id))) {
      throw ApiError.forbidden();
    }

    const message = await Message.create({
      channel: channel._id,
      workspace: channel.workspace,
      sender: req.user!._id,
      body: body ?? '',
      attachments: attachments ?? [],
    });

    await Channel.findByIdAndUpdate(channel._id, { lastMessageAt: new Date() });

    const populated = await Message.findById(message._id).populate('sender', 'name email avatar');

    const io = getIO();
    if (io) {
      const memberIds = channel.type === ChannelType.DIRECT
        ? channel.members.map((m) => String(m))
        : [];
      io.to(`channel:${String(channel._id)}`).emit('message:new', populated);
      for (const id of memberIds) {
        if (String(id) !== String(req.user!._id)) io.to(userRoom(id)).emit('unread:message', { channelId: String(channel._id) });
      }
    }

    res.status(201).json({ success: true, data: { message: populated } });
  } catch (err) {
    next(err);
  }
}

export async function getPresence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    await loadWs(workspaceId, String(req.user!._id));

    const online = await getOnlineUserIds(workspaceId);
    res.json({
      success: true,
      data: {
        online: Array.from(online),
      },
    });
  } catch (err) {
    next(err);
  }
}