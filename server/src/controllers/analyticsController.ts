import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Board } from '../models/Board.js';
import { Task } from '../models/Task.js';
import { Activity } from '../models/Activity.js';
import { Workspace, MemberDoc } from '../models/Workspace.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthRequest } from '../middleware/auth.js';
import { isMember } from '../services/membership.js';

async function ensureBoardAccess(boardId: string, userId: string) {
  if (!Types.ObjectId.isValid(boardId)) throw ApiError.badRequest('Invalid board id');
  const board = await Board.findById(boardId);
  if (!board) throw ApiError.notFound('Board not found');
  const ws = await Workspace.findById(board.workspace);
  if (!ws || !isMember(ws.members as unknown as MemberDoc[], String(userId))) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }
  return { board, ws };
}

export async function boardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { board } = await ensureBoardAccess(boardId, String(req.user!._id));

    const tasks = await Task.find({ board: board._id, archived: { $ne: true } })
      .populate('assignees', 'name email avatar')
      .lean();

    const total = tasks.length;
    const completed = tasks.filter((t) => t.completedAt).length;
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < new Date() && !t.completedAt).length;
    const dueSoon = tasks.filter(
      (t) => t.dueDate && !t.completedAt && t.dueDate > new Date() && t.dueDate < new Date(Date.now() + 3 * 86400000)
    ).length;

    const byColumn: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byLabel: Record<string, number> = {};
    const workload: Array<{ id: string; name: string; count: number; points: number }> = [];

    const workloadMap = new Map<string, { id: string; name: string; count: number; points: number }>();

    for (const t of tasks) {
      const colId = String(t.columnId);
      byColumn[colId] = (byColumn[colId] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      for (const label of t.labels) byLabel[label] = (byLabel[label] ?? 0) + 1;
      for (const a of t.assignees as unknown as Array<{ _id: unknown; name: string }>) {
        const id = String(a._id);
        const entry = workloadMap.get(id) ?? { id, name: a.name, count: 0, points: 0 };
        entry.count += 1;
        entry.points += t.storyPoints ?? 0;
        workloadMap.set(id, entry);
      }
    }

    res.json({
      success: true,
      data: {
        total,
        completed,
        completedRate: total ? Math.round((completed / total) * 100) : 0,
        overdue,
        dueSoon,
        byColumn,
        byPriority,
        byLabel,
        workload: Array.from(workloadMap.values()).sort((a, b) => b.count - a.count),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function burndown(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { board } = await ensureBoardAccess(boardId, String(req.user!._id));

    const days = Math.min(Number(req.query.days) || 14, 30);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const created = await Task.aggregate([
      { $match: { board: board._id, createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
    ]);
    const done = await Task.aggregate([
      { $match: { board: board._id, completedAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, n: { $sum: 1 } } },
    ]);

    const createdMap = new Map(created.map((c) => [c._id, c.n]));
    const doneMap = new Map(done.map((d) => [d._id, d.n]));

    const series: Array<{ date: string; created: number; completed: number }> = [];
    let cumCreated = 0;
    let cumCompleted = 0;

    const totalBeforeStart = await Task.countDocuments({ board: board._id, createdAt: { $lt: start } });

    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const c = createdMap.get(key) ?? 0;
      const done = doneMap.get(key) ?? 0;
      if (i === 0) {
        cumCreated = totalBeforeStart;
        cumCompleted = 0;
      }
      cumCreated += c;
      cumCompleted += done;
      series.push({ date: key, created: cumCreated, completed: cumCompleted });
    }

    res.json({ success: true, data: { series } });
  } catch (err) {
    next(err);
  }
}

export async function workspaceActivity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    if (!Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('Invalid workspace id');
    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    if (!isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const activities = await Activity.find({ workspace: workspaceId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
}