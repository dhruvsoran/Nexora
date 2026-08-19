import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Milestone } from '../models/Milestone';
import { Board } from '../models/Board';
import { Task } from '../models/Task';
import { Workspace, MemberDoc } from '../models/Workspace';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { isMember, requireRole, CAN_MANAGE } from '../services/membership';

async function loadBoard(boardId: string, userId: string) {
  if (!Types.ObjectId.isValid(boardId)) throw ApiError.badRequest('Invalid board id');
  const board = await Board.findById(boardId);
  if (!board) throw ApiError.notFound('Board not found');
  const ws = await Workspace.findById(board.workspace);
  if (!ws || !isMember(ws.members as unknown as MemberDoc[], String(userId))) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }
  return { board, ws };
}

export async function listMilestones(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { board } = await loadBoard(boardId, String(req.user!._id));
    const milestones = await Milestone.find({ board: board._id }).sort({ dueDate: 1 }).lean();
    res.json({ success: true, data: milestones });
  } catch (err) {
    next(err);
  }
}

export async function createMilestone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { name, description, color, dueDate } = req.body;
    if (!name) throw ApiError.badRequest('Milestone name is required');
    const { board, ws } = await loadBoard(boardId, String(req.user!._id));

    const milestone = await Milestone.create({
      workspace: board.workspace,
      board: board._id,
      name,
      description: description ?? '',
      color: color ?? '#f97316',
      dueDate: dueDate ?? null,
      createdBy: req.user!._id,
    });

    res.status(201).json({ success: true, data: { milestone, workspaceId: String(ws._id) } });
  } catch (err) {
    next(err);
  }
}

export async function updateMilestone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, id } = req.params;
    const { board, ws } = await loadBoard(boardId, String(req.user!._id));
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const milestone = await Milestone.findOne({ _id: id, board: board._id });
    if (!milestone) throw ApiError.notFound('Milestone not found');

    const { name, description, color, dueDate, completed } = req.body;
    if (name !== undefined) milestone.name = name;
    if (description !== undefined) milestone.description = description;
    if (color !== undefined) milestone.color = color;
    if (dueDate !== undefined) milestone.dueDate = dueDate ?? null;
    if (completed !== undefined) milestone.completedAt = completed ? new Date() : null;
    await milestone.save();

    res.json({ success: true, data: { milestone } });
  } catch (err) {
    next(err);
  }
}

export async function deleteMilestone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, id } = req.params;
    const { board, ws } = await loadBoard(boardId, String(req.user!._id));
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const milestone = await Milestone.findOneAndDelete({ _id: id, board: board._id });
    if (!milestone) throw ApiError.notFound('Milestone not found');
    await Task.updateMany({ milestone: milestone._id }, { $unset: { milestone: 1 } });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

export async function workspaceCalendar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    if (!Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('Invalid workspace id');
    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    if (!isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const dateFilter: Record<string, unknown> = { $ne: null };
    if (from) dateFilter.$gte = from;
    if (to) dateFilter.$lte = to;

    const boards = await Board.find({ workspace: ws._id, archived: false }).select('_id name key color').lean();
    const boardIds = boards.map((b) => b._id);

    const [tasks, milestones] = await Promise.all([
      Task.find({ workspace: ws._id, dueDate: dateFilter as never })
        .select('title board milestone dueDate priority assignees completedAt')
        .populate('assignees', 'name email avatar')
        .lean(),
      Milestone.find({ workspace: ws._id, dueDate: dateFilter as never })
        .select('board name color dueDate completedAt')
        .lean(),
    ]);

    const boardMap = new Map(boards.map((b) => [String(b._id), b]));
    const events = [
      ...tasks.map((t) => ({
        id: String(t._id),
        kind: 'task' as const,
        title: t.title,
        date: t.dueDate,
        completed: Boolean(t.completedAt),
        board: String(t.board),
        boardName: boardMap.get(String(t.board))?.name ?? '',
      })),
      ...milestones.map((m) => ({
        id: String(m._id),
        kind: 'milestone' as const,
        title: m.name,
        date: m.dueDate,
        completed: Boolean(m.completedAt),
        board: String(m.board),
        boardName: boardMap.get(String(m.board))?.name ?? '',
      })),
    ].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.getTime() - b.date.getTime();
    });

    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}