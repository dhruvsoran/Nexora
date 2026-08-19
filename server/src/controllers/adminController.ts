import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';
import { Workspace } from '../models/Workspace';
import { Board } from '../models/Board';
import { Task } from '../models/Task';
import { AuditLog, AuditAction } from '../models/AuditLog';
import { recordAudit } from '../services/audit';

async function requireAdmin(req: AuthRequest) {
  const user = await User.findById(req.user!._id).select('role');
  if (!user?.role || user.role !== 'admin') {
    throw ApiError.forbidden('Admin access required');
  }
  return user;
}

export async function adminStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireAdmin(req);
    const [users, workspaces, boards, tasks, comments] = await Promise.all([
      User.countDocuments(),
      Workspace.countDocuments(),
      Board.countDocuments(),
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
    ]);
    const [proSubs, activeToday] = await Promise.all([
      Workspace.countDocuments({ 'subscription.plan': { $in: ['pro', 'business'] } }),
      User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        workspaces,
        boards,
        tasks,
        comments: comments[0]?.total ?? 0,
        paidWorkspaces: proSubs,
        activeToday,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function auditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireAdmin(req);
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const skip = Number(req.query.skip ?? 0);

    const logs = await AuditLog.find()
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await AuditLog.countDocuments();

    res.json({ success: true, data: { logs, total } });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireAdmin(req);
    const { q } = req.query;
    const filter = q ? { $or: [{ name: { $regex: String(q), $options: 'i' } }, { email: { $regex: String(q), $options: 'i' } }] } : {};
    const users = await User.find(filter as never)
      .select('name email avatar title role lastSeen createdAt status')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = await requireAdmin(req);
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) throw ApiError.badRequest('Invalid role');

    const target = await User.findById(id);
    if (!target) throw ApiError.notFound('User not found');
    if (String(target._id) === String(admin._id)) throw ApiError.badRequest('Cannot change your own role');

    target.role = role;
    await target.save();
    await recordAudit(String(admin._id), AuditAction.ROLE_CHANGED, 'user', String(target._id), `Changed role to ${role}`);

    res.json({ success: true, data: { user: target } });
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = await requireAdmin(req);
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) throw ApiError.notFound('User not found');
    if (String(target._id) === String(admin._id)) throw ApiError.badRequest('Cannot suspend yourself');

    target.status = 'suspended';
    await target.save();
    await recordAudit(String(admin._id), AuditAction.USER_SUSPENDED, 'user', String(target._id), 'Suspended account');

    res.json({ success: true, data: { user: target } });
  } catch (err) {
    next(err);
  }
}

export async function listWorkspaces(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireAdmin(req);
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const workspaces = await Workspace.find()
      .select('name key owner members subscription createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: workspaces.map((w) => ({
        id: String(w._id),
        name: w.name,
        key: w.key,
        owner: String(w.owner),
        memberCount: w.members.length,
        subscription: w.subscription,
        createdAt: w.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}