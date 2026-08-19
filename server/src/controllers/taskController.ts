import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Task, TaskPriority } from '../models/Task';
import { Board, ColumnDoc } from '../models/Board';
import { Workspace, MemberDoc } from '../models/Workspace';
import { Comment } from '../models/Comment';
import { Activity, ActivityType } from '../models/Activity';
import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { isMember } from '../services/membership';
import { getIO, boardRoom, userRoom } from '../services/socketService';
import { getRedis, cacheKey } from '../config/redis';
import { destroyFile } from '../services/cloudinary';

function invalidateBoard(boardId: string) {
  return getRedis().del(cacheKey('board', boardId)).catch(() => undefined);
}

async function getBoardOrThrow(id: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid board id');
  const board = await Board.findById(id);
  if (!board) throw ApiError.notFound('Board not found');
  return board;
}

async function getTaskOrThrow(board: { _id: Types.ObjectId }, taskId: string) {
  const task = await Task.findOne({ _id: taskId, board: board._id });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

async function ensureMember(workspaceId: string, userId: string) {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw ApiError.notFound('Workspace not found');
  if (!isMember(ws.members as unknown as MemberDoc[], String(userId))) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }
  return ws;
}

async function pushActivity(task: { _id: Types.ObjectId; board: Types.ObjectId }, workspaceId: Types.ObjectId, user: string, type: ActivityType, message: string) {
  return Activity.create({ task: task._id, board: task.board, workspace: workspaceId, author: user, type, message });
}

async function createNotificationFor(actor: string, recipient: string, workspaceId: Types.ObjectId, type: NotificationType, title: string, body = '', link = '') {
  if (String(actor) === String(recipient)) return;
  const notif = await Notification.create({
    user: recipient,
    workspace: workspaceId,
    type,
    title,
    body,
    link,
    actor,
  });
  const io = getIO();
  if (io) io.to(userRoom(String(recipient))).emit('notification:new', notif);
}

export async function createTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { title, description, columnId, priority, labels, storyPoints, dueDate, assignees } = req.body;

    if (!title) throw ApiError.badRequest('title is required');
    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));

    const cols = (board.columns as ColumnDoc[]).slice().sort((a, b) => a.order - b.order);
    const colRef = columnId ?? cols[0]?._id;
    if (!colRef) throw ApiError.badRequest('Board has no columns');
    const maxOrder = await Task.find({ board: board._id, columnId: colRef })
      .sort({ order: -1 })
      .select('order')
      .limit(1)
      .lean();
    const order = maxOrder.length ? maxOrder[0].order + 1 : 0;

    const task = await Task.create({
      board: board._id,
      workspace: board.workspace,
      columnId: colRef,
      title,
      description: description ?? '',
      order,
      priority: priority ?? TaskPriority.MEDIUM,
      labels: labels ?? [],
      storyPoints: Number(storyPoints) || 0,
      dueDate: dueDate ?? null,
      assignees: assignees ?? [],
      createdBy: req.user!._id,
    });

    await pushActivity(task, ws._id, String(req.user!._id), ActivityType.CREATED, `created this task`);
    await invalidateBoard(String(board._id));

    for (const a of assignees ?? []) {
      await createNotificationFor(
        String(req.user!._id),
        String(a),
        ws._id,
        NotificationType.TASK_ASSIGNED,
        `You were assigned to "${task.title}"`,
        board.name,
        `/workspaces/${String(ws._id)}/boards/${String(board._id)}`
      );
    }

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:created', { taskId: String(task._id) });

    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function getTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const board = await getBoardOrThrow(boardId);
    await ensureMember(String(board.workspace), String(req.user!._id));

    const tasks = await Task.find({ board: board._id, archived: { $ne: true } })
      .sort({ order: 1 })
      .populate('assignees', 'name email avatar title')
      .populate('createdBy', 'name email avatar')
      .lean();

    res.json({
      success: true,
      data: tasks.map((t) => ({
        id: String(t._id),
        title: t.title,
        columnId: String(t.columnId),
        order: t.order,
        priority: t.priority,
        labels: t.labels,
        storyPoints: t.storyPoints,
        dueDate: t.dueDate,
        assignees: t.assignees,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const board = await getBoardOrThrow(boardId);
    await ensureMember(String(board.workspace), String(req.user!._id));

    const task = await Task.findOne({ _id: taskId, board: board._id })
      .populate('assignees', 'name email avatar title')
      .populate('createdBy', 'name email avatar')
      .lean();
    if (!task) throw ApiError.notFound('Task not found');

    const [comments, activities] = await Promise.all([
      Comment.find({ task: task._id })
        .populate('author', 'name email avatar')
        .sort({ createdAt: 1 })
        .lean(),
      Activity.find({ task: task._id })
        .populate('author', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    res.json({
      success: true,
      data: { task, comments, activities },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);
    const previousAssigneeIds = (task.assignees ?? []).map((a) => String(a));

    const allowed = [
      'title', 'description', 'columnId', 'order', 'priority', 'labels',
      'storyPoints', 'dueDate', 'assignees',
      'dependencies', 'subtasks', 'timeEstimate', 'timeSpent', 'attachments', 'milestone',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (task as unknown as Record<string, unknown>)[key] = req.body[key];
    }

    if (task.columnId && req.body.columnId && String(req.body.columnId) === String(task.columnId)) {
      // no move
    } else if (req.body.columnId) {
      await pushActivity(task, ws._id, String(req.user!._id), ActivityType.MOVED, `moved the task`);
    } else {
      await pushActivity(task, ws._id, String(req.user!._id), ActivityType.UPDATED, `updated the task`);
    }

    if (req.body.assignees) {
      const newIds = (req.body.assignees as unknown[]).map((a) => String(a));
      for (const id of newIds) {
        if (!previousAssigneeIds.includes(id)) {
          await createNotificationFor(
            String(req.user!._id),
            id,
            ws._id,
            NotificationType.TASK_ASSIGNED,
            `You were assigned to "${task.title}"`,
            board.name,
            `/workspaces/${String(ws._id)}/boards/${String(board._id)}`
          );
        }
      }
    }

    await task.save();
    await invalidateBoard(String(board._id));

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:updated', { taskId: String(task._id) });

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function moveTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const { columnId, targetOrder, fromOrder } = req.body;

    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    if (!columnId) throw ApiError.badRequest('columnId is required');

    const sameColumn = String(task.columnId) === String(columnId);

    if (sameColumn && typeof targetOrder === 'number') {
      const peers = await Task.find({ board: board._id, columnId: task.columnId }).sort({ order: 1 });
      peers.sort((a, b) => a.order - b.order);
      peers.splice(peers.findIndex((p) => String(p._id) === String(task._id)), 1);
      peers.splice(Math.min(targetOrder, peers.length), 0, task);
      for (let i = 0; i < peers.length; i += 1) {
        if (peers[i].order !== i) peers[i].order = i;
      }
      await Promise.all(peers.map((p) => p.save()));
      await pushActivity(task, ws._id, String(req.user!._id), ActivityType.MOVED, 'reordered the task');
    } else {
      const nextOrder = typeof targetOrder === 'number' ? targetOrder : null;
      const maxOrder = await Task.find({ board: board._id, columnId })
        .sort({ order: -1 })
        .select('order')
        .limit(1)
        .lean();
      const fallback = maxOrder.length ? maxOrder[0].order + 1 : 0;
      task.columnId = new Types.ObjectId(columnId);
      task.order = nextOrder ?? fallback;

      const peers = await Task.find({ board: board._id, columnId: task.columnId }).sort({ order: 1 });
      peers.sort((a, b) => a.order - b.order);
      peers.splice(peers.findIndex((p) => String(p._id) === String(task._id)), 1);
      peers.splice(Math.min(task.order, peers.length), 0, task);
      for (let i = 0; i < peers.length; i += 1) {
        if (peers[i].order !== i) peers[i].order = i;
      }
      await Promise.all(peers.map((p) => p.save()));
      await pushActivity(task, ws._id, String(req.user!._id), ActivityType.MOVED, 'moved the task');
    }

    if (req.body.completed === true) {
      task.completedAt = new Date();
      await task.save();
    }

    await invalidateBoard(String(board._id));
    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:moved', { taskId: String(task._id) });

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    await Comment.deleteMany({ task: task._id });
    await Activity.deleteMany({ task: task._id });
    await task.deleteOne();
    await invalidateBoard(String(board._id));

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:deleted', { taskId });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const { body, attachments } = req.body;
    if (!body) throw ApiError.badRequest('Comment body is required');

    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    const comment = await Comment.create({
      task: task._id,
      board: board._id,
      workspace: board.workspace,
      author: req.user!._id,
      body,
      attachments: attachments ?? [],
    });

    await pushActivity(task, ws._id, String(req.user!._id), ActivityType.COMMENTED, 'commented on this task');

    const populated = await Comment.findById(comment._id).populate('author', 'name email avatar');
    for (const assignee of task.assignees ?? []) {
      await createNotificationFor(
        String(req.user!._id),
        String(assignee),
        ws._id,
        NotificationType.COMMENT,
        `${req.user!.name} commented on "${task.title}"`,
        body.slice(0, 120),
        `/workspaces/${String(ws._id)}/boards/${String(board._id)}`
      );
    }

    const memberIds = ws.members.map((m) => String(m.user));
    const workspaceUsers = await User.find({ _id: { $in: memberIds } }).select('name');
    for (const u of workspaceUsers) {
      if (String(u._id) === String(req.user!._id)) continue;
      const atName = `@${u.name}`;
      if (body.toLowerCase().includes(atName.toLowerCase())) {
        await createNotificationFor(
          String(req.user!._id),
          String(u._id),
          ws._id,
          NotificationType.TASK_MENTIONED,
          `${req.user!.name} mentioned you on "${task.title}"`,
          body.slice(0, 120),
          `/workspaces/${String(ws._id)}/boards/${String(board._id)}`
        );
      }
    }

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('comment:created', { comment: populated });

    res.status(201).json({ success: true, data: { comment: populated } });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, commentId } = req.params;
    const board = await getBoardOrThrow(boardId);
    await ensureMember(String(board.workspace), String(req.user!._id));

    const comment = await Comment.findById(commentId);
    if (!comment) throw ApiError.notFound('Comment not found');
    if (String(comment.author) !== String(req.user!._id)) {
      throw ApiError.forbidden('You can only delete your own comments');
    }
    await comment.deleteOne();

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('comment:deleted', { commentId });
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

export async function taskActivity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const board = await getBoardOrThrow(boardId);
    await ensureMember(String(board.workspace), String(req.user!._id));

    const activities = await Activity.find({ task: taskId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
}

export async function logTime(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const minutes = Number(req.body.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) throw ApiError.badRequest('minutes must be a positive number');

    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    task.timeSpent = (task.timeSpent ?? 0) + minutes;
    await task.save();
    await pushActivity(
      task,
      ws._id,
      String(req.user!._id),
      ActivityType.UPDATED,
      `logged ${minutes} min of time on this task`
    );
    await invalidateBoard(String(board._id));

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:updated', { taskId: String(task._id) });

    res.json({ success: true, data: { timeSpent: task.timeSpent } });
  } catch (err) {
    next(err);
  }
}

export async function attachFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const { attachment } = req.body;
    if (!attachment?.publicId || !attachment?.url) throw ApiError.badRequest('attachment is required');

    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    task.attachments.push({ publicId: attachment.publicId, url: attachment.url, name: attachment.name ?? '', size: attachment.size ?? 0 });
    await task.save();
    await pushActivity(task, ws._id, String(req.user!._id), ActivityType.UPDATED, 'attached a file to this task');
    await invalidateBoard(String(board._id));

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:updated', { taskId: String(task._id) });

    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function addVoiceNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const { attachment, durationMs, mime } = req.body;
    if (!attachment?.publicId || !attachment?.url) throw ApiError.badRequest('voice note audio is required');

    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    const note = {
      publicId: attachment.publicId,
      url: attachment.url,
      name: attachment.name ?? '',
      durationMs: Number(durationMs) || 0,
      mime: String(mime || 'audio/webm'),
      by: { _id: req.user!._id, name: req.user!.name },
    };
    task.voiceNotes.push(note as unknown as (typeof task.voiceNotes)[number]);
    await task.save();

    await pushActivity(task, ws._id, String(req.user!._id), ActivityType.UPDATED, 'added a voice note');
    await invalidateBoard(String(board._id));

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:updated', { taskId: String(task._id) });

    res.status(201).json({ success: true, data: { note } });
  } catch (err) {
    next(err);
  }
}

export async function deleteVoiceNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId, noteId } = req.params;
    const board = await getBoardOrThrow(boardId);
    const ws = await ensureMember(String(board.workspace), String(req.user!._id));
    const task = await getTaskOrThrow(board, taskId);

    const notes = task.voiceNotes as unknown as Array<{ _id?: unknown; publicId: string; by: { _id: unknown } }>;
    const note = notes.find((n) => String(n._id) === String(noteId));
    if (!note) throw ApiError.notFound('Voice note not found');
    if (String(note.by._id) !== String(req.user!._id)) {
      throw ApiError.forbidden('You can only delete your own voice notes');
    }

    task.voiceNotes = notes.filter((n) => String(n._id) !== String(noteId)) as unknown as typeof task.voiceNotes;
    await task.save();
    await pushActivity(task, ws._id, String(req.user!._id), ActivityType.UPDATED, 'removed a voice note');
    await invalidateBoard(String(board._id));
    await destroyFile(note.publicId).catch(() => undefined);

    const io = getIO();
    if (io) io.to(boardRoom(String(board._id))).emit('task:updated', { taskId: String(task._id) });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}