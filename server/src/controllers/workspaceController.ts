import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Workspace, WorkspaceRole, MemberDoc } from '../models/Workspace.js';
import { Board } from '../models/Board.js';
import { Channel, ChannelType } from '../models/Channel.js';
import { Task } from '../models/Task.js';
import { Milestone } from '../models/Milestone.js';
import { Message } from '../models/Message.js';
import { Comment } from '../models/Comment.js';
import { Activity } from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthRequest } from '../middleware/auth.js';
import { getRole, isMember, requireRole, CAN_MANAGE } from '../services/membership.js';
import { getRedis, cacheKey } from '../config/redis.js';
import { recordAudit } from '../services/audit.js';
import { destroyFile } from '../services/cloudinary.js';
import { AuditAction } from '../models/AuditLog.js';

const CACHE_TTL = 60;

type LeanWorkspace = {
  _id: Types.ObjectId;
  name: string;
  description: string;
  key: string;
  logo: string;
  owner: Types.ObjectId;
  members: MemberDoc[];
  invitedEmails: string[];
  subscription?: { plan?: string; status?: string; startsAt?: Date; endsAt?: Date | null };
  createdAt: Date;
  updatedAt: Date;
};

function cache(id: string, value: unknown, ttl = CACHE_TTL) {
  return getRedis().set(cacheKey('ws', id), JSON.stringify(value), 'EX', ttl).catch(() => undefined);
}

async function getCached(id: string) {
  try {
    const raw = await getRedis().get(cacheKey('ws', id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function invalidate(id: string) {
  return getRedis().del(cacheKey('ws', id)).catch(() => undefined);
}

export async function myWorkspaces(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user!._id }).lean();
    const ids = workspaces.map((w) => w._id);
    const counts = await Board.aggregate([
      { $match: { workspace: { $in: ids }, archived: false } },
      { $group: { _id: '$workspace', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = workspaces.map((w) => {
      const lean = w as unknown as LeanWorkspace;
      return {
        id: String(lean._id),
        name: lean.name,
        description: lean.description,
        key: lean.key,
        logo: lean.logo,
        role: getRole(lean.members, String(req.user!._id)),
        plan: lean.subscription?.plan ?? 'free',
        boardCount: countMap.get(String(lean._id)) ?? 0,
        createdAt: lean.createdAt,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, key, logo } = req.body;
    if (!name || !key) throw ApiError.badRequest('name and key are required');

    const ws = await Workspace.create({
      name,
      description: description ?? '',
      logo: logo ?? '',
      key: String(key).toUpperCase().slice(0, 6),
      owner: req.user!._id,
      members: [{ user: req.user!._id, role: WorkspaceRole.OWNER }],
    });

    const channel = await Channel.create({
      workspace: ws._id,
      name: 'general',
      type: ChannelType.CHANNEL,
      createdBy: req.user!._id,
      members: [req.user!._id],
    });

    await recordAudit(String(req.user!._id), AuditAction.WORKSPACE_CREATED, 'workspace', String(ws._id), `Created "${name}"`);

    res.status(201).json({
      success: true,
      data: { workspace: ws.toObject(), generalChannel: channel.toObject() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid workspace id');

    const ws = await Workspace.findById(id).lean();
    if (!ws) throw ApiError.notFound('Workspace not found');
    const leanWs = ws as unknown as LeanWorkspace;
    if (!isMember(leanWs.members, String(req.user!._id))) {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const cached = await getCached(id);
    if (cached) {
      res.json({
        success: true,
        data: { ...cached, myRole: getRole(leanWs.members, String(req.user!._id)) },
      });
      return;
    }

    const boards = await Board.find({ workspace: ws._id, archived: false })
      .sort({ createdAt: 1 })
      .select('-columns')
      .lean();

    const memberIds = leanWs.members.map((m) => m.user);
    const users = await User.find({ _id: { $in: memberIds } }).select('name email avatar title').lean();
    const profileMap = new Map(users.map((u) => [String(u._id), u]));

    const data = {
      id: String(leanWs._id),
      name: leanWs.name,
      description: leanWs.description,
      key: leanWs.key,
      logo: leanWs.logo,
      owner: String(leanWs.owner),
      invitedEmails: leanWs.invitedEmails,
      createdAt: leanWs.createdAt,
      boards: boards.map((b) => ({
        id: String(b._id),
        name: b.name,
        description: b.description,
        key: b.key,
        color: b.color,
        createdAt: b.createdAt,
      })),
      members: leanWs.members.map((m) => ({
        user: String(m.user),
        role: m.role,
        joinedAt: m.joinedAt,
        profile: profileMap.get(String(m.user)) ?? null,
      })),
      subscription: {
        plan: leanWs.subscription?.plan ?? 'free',
        status: leanWs.subscription?.status ?? 'active',
        endsAt: leanWs.subscription?.endsAt ?? null,
      },
    };
    const myRole = getRole(leanWs.members, String(req.user!._id));

    await cache(id, data);
    res.json({ success: true, data: { ...data, myRole } });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ws = await Workspace.findById(id);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const { name, description, logo } = req.body;
    if (name !== undefined) ws.name = name;
    if (description !== undefined) ws.description = description;
    if (logo !== undefined) ws.logo = logo;
    await ws.save();
    await invalidate(id);

    res.json({ success: true, data: { workspace: ws } });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ws = await Workspace.findById(id);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), [WorkspaceRole.OWNER]);

    await Board.deleteMany({ workspace: ws._id });
    await Channel.deleteMany({ workspace: ws._id });
    const boards = await Board.find({ workspace: ws._id }).select('_id').lean();
    const boardIds = boards.map((b) => b._id);

    const [tasks, messages] = await Promise.all([
      Task.find({ workspace: ws._id }).select('attachments voiceNotes').lean(),
      Message.find({ workspace: ws._id }).select('attachments').lean(),
    ]);
    const publicIds: string[] = [];
    for (const t of tasks) {
      for (const a of (t.attachments ?? []) as Array<{ publicId?: string }>) if (a.publicId) publicIds.push(a.publicId);
      for (const v of (t.voiceNotes ?? []) as Array<{ publicId?: string }>) if (v.publicId) publicIds.push(v.publicId);
    }
    for (const m of messages) {
      for (const a of (m.attachments ?? []) as Array<{ publicId?: string }>) if (a.publicId) publicIds.push(a.publicId);
    }

    await Task.deleteMany({ workspace: ws._id });
    await Milestone.deleteMany({ workspace: ws._id });
    await Comment.deleteMany({ workspace: ws._id });
    await Activity.deleteMany({ workspace: ws._id });
    await Message.deleteMany({ workspace: ws._id });
    await Notification.deleteMany({ workspace: ws._id });
    await ws.deleteOne();
    await invalidate(id);
    for (const b of boardIds) {
      await getRedis().del(cacheKey('board', String(b))).catch(() => undefined);
    }
    await Promise.all(publicIds.map((id) => destroyFile(id).catch(() => undefined)));

    await recordAudit(String(req.user!._id), AuditAction.WORKSPACE_DELETED, 'workspace', String(ws._id), `Deleted "${ws.name}"`);

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

export async function inviteMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    if (!email) throw ApiError.badRequest('email is required');

    const ws = await Workspace.findById(id);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const target = await User.findOne({ email: String(email).toLowerCase() });
    if (target) {
      const already = ws.members.some((m) => String(m.user) === String(target._id));
      if (already) throw ApiError.conflict('User is already a member');
      ws.members.push({ user: target._id, role: role ?? WorkspaceRole.MEMBER });
    } else if (!ws.invitedEmails.includes(String(email).toLowerCase())) {
      ws.invitedEmails.push(String(email).toLowerCase());
    }

    await ws.save();
    await invalidate(id);
    res.status(201).json({
      success: true,
      data: { message: target ? 'Member added' : 'Invitation registered for email' },
    });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, memberId } = req.params;
    const ws = await Workspace.findById(id);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    if (String(ws.owner) === memberId) throw ApiError.badRequest('Cannot remove the owner');
    ws.set(
      'members',
      ws.members.filter((m) => String(m.user) !== memberId)
    );
    await ws.save();
    await invalidate(id);

    res.json({ success: true, data: { removed: true } });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    if (!Object.values(WorkspaceRole).includes(role)) throw ApiError.badRequest('Invalid role');

    const ws = await Workspace.findById(id);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), [WorkspaceRole.OWNER]);

    const member = ws.members.find((m) => String(m.user) === memberId);
    if (!member) throw ApiError.notFound('Member not found');
    if (String(ws.owner) === memberId && role !== WorkspaceRole.OWNER) {
      throw ApiError.badRequest('The owner must keep the owner role');
    }
    member.role = role;
    await ws.save();
    await invalidate(id);

    res.json({ success: true, data: { updated: true } });
  } catch (err) {
    next(err);
  }
}

export async function members(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ws = await Workspace.findById(id);
    if (!ws) throw ApiError.notFound('Workspace not found');
    if (!isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden();
    }

    const users = await User.find({ _id: { $in: ws.members.map((m) => m.user) } })
      .select('name email avatar title')
      .lean();

    const map = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      success: true,
      data: ws.members.map((m) => ({
        id: String(m.user),
        role: m.role,
        joinedAt: m.joinedAt,
        profile: map.get(String(m.user)) ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}