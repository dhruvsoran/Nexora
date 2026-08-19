import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Board, ColumnDoc } from '../models/Board';
import { Workspace, MemberDoc } from '../models/Workspace';
import { Task } from '../models/Task';
import { Milestone } from '../models/Milestone';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { isMember, requireRole, CAN_MANAGE } from '../services/membership';
import { getRedis, cacheKey } from '../config/redis';

const CACHE_TTL = 30;

function cache(id: string, value: unknown) {
  return getRedis().set(cacheKey('board', id), JSON.stringify(value), 'EX', CACHE_TTL).catch(() => undefined);
}

async function getCached(id: string) {
  try {
    const raw = await getRedis().get(cacheKey('board', id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function invalidate(id: string) {
  return getRedis().del(cacheKey('board', id)).catch(() => undefined);
}

async function loadWorkspace(id: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid workspace id');
  const ws = await Workspace.findById(id);
  if (!ws) throw ApiError.notFound('Workspace not found');
  return ws;
}

export async function createBoard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const { name, description, key, color } = req.body;
    if (!name || !key) throw ApiError.badRequest('name and key are required');

    const ws = await loadWorkspace(workspaceId);
    if (!isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const board = await Board.create({
      workspace: ws._id,
      name,
      description: description ?? '',
      key: String(key).toUpperCase().slice(0, 6),
      color: color ?? '#0d9488',
      createdBy: req.user!._id,
      columns: [
        { name: 'To Do', color: '#64748b', order: 0 },
        { name: 'In Progress', color: '#0d9488', order: 1 },
        { name: 'Done', color: '#22c55e', order: 2 },
      ],
    });

    await getRedis().del(cacheKey('ws', workspaceId)).catch(() => undefined);
    res.status(201).json({ success: true, data: { board } });
  } catch (err) {
    next(err);
  }
}

export async function getBoard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid board id');

    const board = await Board.findById(id).lean();
    if (!board) throw ApiError.notFound('Board not found');

    const ws = await Workspace.findById(board.workspace).select('members name key').lean();
    if (!ws || !isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const cached = await getCached(id);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    const columns = (board.columns as ColumnDoc[]).sort((a, b) => a.order - b.order);
    const [tasks, milestones] = await Promise.all([
      Task.find({ board: board._id, archived: { $ne: true } })
        .sort({ order: 1 })
        .populate('assignees', 'name email avatar title')
        .populate('createdBy', 'name email avatar')
        .populate('dependencies', 'title completedAt')
        .populate('milestone', 'name color description')
        .lean(),
      Milestone.find({ board: board._id }).sort({ dueDate: 1, createdAt: 1 }).lean(),
    ]);

    const data = {
      id: String(board._id),
      name: board.name,
      description: board.description,
      key: board.key,
      color: board.color,
      workspace: String(board.workspace),
      workspaceName: ws.name,
      createdAt: board.createdAt,
      columns: columns.map((c) => ({
        id: String(c._id),
        name: c.name,
        color: c.color,
        order: c.order,
        limit: c.limit,
      })),
      tasks: tasks.map((t) => ({
        id: String(t._id),
        title: t.title,
        description: t.description,
        columnId: String(t.columnId),
        order: t.order,
        priority: t.priority,
        labels: t.labels,
        storyPoints: t.storyPoints,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        attachmentsCount: t.attachments.length,
        attachments: t.attachments,
        voiceNotes: t.voiceNotes ?? [],
        milestone: t.milestone
          ? {
              _id: String((t.milestone as unknown as { _id: unknown })._id),
              name: (t.milestone as unknown as { name: string }).name,
              color: (t.milestone as unknown as { color?: string }).color ?? '#f97316',
              description: (t.milestone as unknown as { description?: string }).description ?? '',
            }
          : null,
        dependencies: (t.dependencies as unknown as Array<{ _id: unknown; title: string; completedAt?: Date }>).map((d) => ({
          id: String(d._id),
          title: d.title,
          status: d.completedAt ? 'done' : 'pending',
        })),
        subtasks: t.subtasks,
        timeEstimate: t.timeEstimate,
        timeSpent: t.timeSpent,
        assignees: (t.assignees as unknown as Array<{ _id: unknown; name: string; email: string; avatar?: string }>).map(
          (a) => ({
            id: String(a._id),
            name: a.name,
            email: a.email,
            avatar: a.avatar ?? '',
          })
        ),
        createdBy: {
          id: String((t.createdBy as unknown as { _id: unknown })._id),
          name: (t.createdBy as unknown as { name: string }).name,
        },
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      milestones: milestones.map((m) => ({
        _id: String(m._id),
        name: m.name,
        description: m.description,
        color: m.color,
        dueDate: m.dueDate,
        createdAt: m.createdAt,
      })),
    };

    await cache(id, data);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateBoard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const board = await Board.findById(id);
    if (!board) throw ApiError.notFound('Board not found');

    const ws = await loadWorkspace(String(board.workspace));
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const { name, description, color, columns } = req.body;
    if (name !== undefined) board.name = name;
    if (description !== undefined) board.description = description;
    if (color !== undefined) board.color = color;
    if (columns !== undefined && Array.isArray(columns)) {
      board.set(
        'columns',
        columns.map((c: Partial<ColumnDoc>, idx: number) => ({
          _id: c._id ? new Types.ObjectId(c._id) : new Types.ObjectId(),
          name: c.name ?? '',
          color: c.color ?? '#64748b',
          order: c.order ?? idx,
          limit: c.limit ?? 0,
        }))
      );
    }
    await board.save();
    await invalidate(id);
    await getRedis().del(cacheKey('ws', String(board.workspace))).catch(() => undefined);

    res.json({ success: true, data: { board } });
  } catch (err) {
    next(err);
  }
}

export async function archiveBoard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const board = await Board.findById(id);
    if (!board) throw ApiError.notFound('Board not found');

    const ws = await loadWorkspace(String(board.workspace));
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    board.archived = !board.archived;
    await board.save();
    await invalidate(id);
    await getRedis().del(cacheKey('ws', String(board.workspace))).catch(() => undefined);

    res.json({ success: true, data: { board } });
  } catch (err) {
    next(err);
  }
}