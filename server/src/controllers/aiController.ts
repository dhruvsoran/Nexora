import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Board, ColumnDoc } from '../models/Board';
import { Task } from '../models/Task';
import { Workspace, MemberDoc } from '../models/Workspace';
import { Activity } from '../models/Activity';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { isMember } from '../services/membership';
import { generateJson } from '../services/gemini';
import { User } from '../models/User';
import { getRedis, cacheKey } from '../config/redis';

function invalidateBoard(boardId: string) {
  return getRedis().del(cacheKey('board', boardId)).catch(() => undefined);
}

async function loadBoardContext(boardId: string, userId: string) {
  if (!Types.ObjectId.isValid(boardId)) throw ApiError.badRequest('Invalid board id');
  const board = await Board.findById(boardId);
  if (!board) throw ApiError.notFound('Board not found');
  const ws = await Workspace.findById(board.workspace);
  if (!ws || !isMember(ws.members as unknown as MemberDoc[], String(userId))) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }
  return { board, ws };
}

function taskSummaryLines(tasks: Array<Record<string, unknown>>) {
  return tasks
    .slice(0, 60)
    .map((t) => `- [${t.priority}] ${t.title}${t.description ? ` :: ${String(t.description).slice(0, 200)}` : ''}`)
    .join('\n');
}

export async function summarizeBoard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { board } = await loadBoardContext(boardId, String(req.user!._id));

    const tasks = await Task.find({ board: board._id, archived: { $ne: true } })
      .select('title description priority columnId labels')
      .lean();

    const columns = (board.columns as ColumnDoc[]).map((c) => c.name).join(', ');
    const prompt = `You are a project management assistant. Summarize this board for a team standup.\nBoard: "${board.name}"\nColumns: ${columns}\nTasks:\n${taskSummaryLines(tasks as never)}\n\nReturn JSON with keys: summary (2-3 sentences), highlights (array of 3 bullet strings), risks (array of strings, may be empty).`;

    const data = await generateJson(prompt);
    res.json({
      success: true,
      data: {
        summary: data.summary ?? 'No summary available',
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        risks: Array.isArray(data.risks) ? data.risks : [],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function summarizeTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId, taskId } = req.params;
    const { board } = await loadBoardContext(boardId, String(req.user!._id));

    const task = await Task.findOne({ _id: taskId, board: board._id }).lean();
    if (!task) throw ApiError.notFound('Task not found');

    const prompt = `Summarize this task for the assignee.\nTitle: ${task.title}\nDescription: ${task.description}\nPriority: ${task.priority}\nLabels: ${(task.labels ?? []).join(', ')}\n\nReturn JSON with keys: summary (2-3 sentences) and nextSteps (array of strings).`;

    const data = await generateJson(prompt);
    res.json({
      success: true,
      data: {
        summary: data.summary ?? 'No summary available',
        nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps : [],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function estimateStoryPoints(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { title, description } = req.body;
    if (!title) throw ApiError.badRequest('title is required');
    await loadBoardContext(boardId, String(req.user!._id));

    const prompt = `Estimate the complexity of this task in Fibonacci story points (1,2,3,5,8,13).\nTitle: ${title}\nDescription: ${description ?? ''}\nReturn JSON: { "storyPoints": number, "reason": string }`;

    const data = await generateJson(prompt);
    res.json({
      success: true,
      data: {
        storyPoints: Number(data.storyPoints) || 3,
        reason: data.reason ?? '',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function suggestLabels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { title, description } = req.body;
    if (!title) throw ApiError.badRequest('title is required');
    await loadBoardContext(boardId, String(req.user!._id));

    const prompt = `Suggest up to 4 short labels for this task (e.g. frontend, backend, bug, design).\nTitle: ${title}\nDescription: ${description ?? ''}\nReturn JSON: { "labels": string[] }`;

    const data = await generateJson(prompt);
    res.json({
      success: true,
      data: { labels: Array.isArray(data.labels) ? data.labels : [] },
    });
  } catch (err) {
    next(err);
  }
}

export async function generateTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { prompt } = req.body;
    if (!prompt) throw ApiError.badRequest('prompt is required');
    const { board, ws } = await loadBoardContext(boardId, String(req.user!._id));

    const data = await generateJson(
      `Break this project request into concrete, well-scoped tasks for a kanban board.\nRequest: "${prompt}"\nReturn JSON: { "tasks": [ { "title": string, "description": string, "priority": "low|medium|high|urgent", "labels": string[], "storyPoints": number } ] } with up to 8 tasks.`
    );
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    if (!tasks.length) throw ApiError.internal('AI returned no tasks');

    const cols = (board.columns as ColumnDoc[]).slice().sort((a, b) => a.order - b.order);
    const colId = cols[0]?._id;
    if (!colId) throw ApiError.badRequest('Board has no columns');

    let order = await Task.countDocuments({ board: board._id, columnId: colId });
    const created: Array<Record<string, unknown>> = [];
    for (const t of tasks as Array<Record<string, unknown>>) {
      const task = await Task.create({
        board: board._id,
        workspace: board.workspace,
        columnId: colId,
        title: String(t.title ?? 'Untitled task').slice(0, 200),
        description: String(t.description ?? '').slice(0, 10000),
        priority: ['low', 'medium', 'high', 'urgent'].includes(String(t.priority)) ? String(t.priority) : 'medium',
        labels: Array.isArray(t.labels) ? t.labels.map(String) : [],
        storyPoints: Number(t.storyPoints) || 0,
        order: order++,
        createdBy: req.user!._id,
      });
      created.push({ id: String(task._id), title: task.title });
    }

    await invalidateBoard(String(board._id));
    res.status(201).json({ success: true, data: { tasks: created, workspaceId: String(ws._id) } });
  } catch (err) {
    next(err);
  }
}

export async function prioritizeTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { board } = await loadBoardContext(boardId, String(req.user!._id));

    const tasks = await Task.find({ board: board._id, archived: { $ne: true } })
      .select('title dueDate storyPoints priority completedAt')
      .sort({ order: 1 })
      .limit(60)
      .lean();

    const listing = tasks.map((t) => `${String(t._id)} :: ${t.title} :: due ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : 'none'} :: points ${t.storyPoints}`).join('\n');
    const data = await generateJson(
      `Prioritize these tasks. Consider due dates, effort, and importance.\n${listing}\nReturn JSON: { "priorities": [ { "id": string, "priority": "low|medium|high|urgent", "reason": string } ] } for every task.`
    );

    const priorities = Array.isArray(data.priorities) ? data.priorities : [];
    const byId = new Map(tasks.map((t) => [String(t._id), t]));
    const results: Array<Record<string, unknown>> = [];
    for (const p of priorities as Array<Record<string, unknown>>) {
      const id = String(p.id);
      if (!byId.has(id)) continue;
      const priority = ['low', 'medium', 'high', 'urgent'].find((v) => v === p.priority) ?? null;
      if (priority) {
        await Task.updateOne({ _id: id }, { $set: { priority } });
      }
      results.push({ id, reason: String(p.reason ?? '') });
    }

    await invalidateBoard(String(board._id));
    res.json({ success: true, data: { tasks: results } });
  } catch (err) {
    next(err);
  }
}

export async function detectRisks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardId } = req.params;
    const { board } = await loadBoardContext(boardId, String(req.user!._id));

    const tasks = await Task.find({ board: board._id, archived: { $ne: true } })
      .select('title dueDate storyPoints priority completedAt createdAt')
      .lean();

    const listing = tasks
      .map((t) => `${String(t._id)} :: ${t.title} :: priority ${t.priority} :: due ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : 'none'} :: completed ${t.completedAt ? 'yes' : 'no'} :: created ${t.createdAt.toISOString().slice(0, 10)}`)
      .join('\n');

    const data = await generateJson(
      `Analyze these tasks for delivery risk (overdue, due soon with no progress, heavy unstarted work, etc.).\n${listing}\nReturn JSON: { "risks": [ { "id": string, "level": "low|medium|high", "reason": string, "suggestion": string } ] } (empty array if none).`
    );

    const risks = Array.isArray(data.risks) ? data.risks : [];
    res.json({
      success: true,
      data: {
        risks: risks.map((r) => ({
          id: String(r.id),
          level: String(r.level ?? 'medium'),
          reason: String(r.reason ?? ''),
          suggestion: String(r.suggestion ?? ''),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function weeklyReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    if (!Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('Invalid workspace id');
    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    if (!isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStart = new Date(weekAgo.setHours(0, 0, 0, 0));
    const [tasks, activities, boards] = await Promise.all([
      Task.find({ workspace: ws._id, createdAt: { $gte: weekAgoStart } }).select('title board priority dueDate completedAt').lean(),
      Activity.find({ workspace: ws._id, createdAt: { $gte: weekAgoStart } }).countDocuments(),
      Board.find({ workspace: ws._id }).select('name').lean(),
    ]);

    const created = tasks.length;
    const completed = tasks.filter((t) => t.completedAt).length;
    const membersCount = ws.members.length;

    const data = await generateJson(
      `Write a weekly progress report for a team. Context: workspace "${ws.name}", ${boards.length} boards, ${membersCount} members. This week: ${created} tasks created, ${completed} completed, ${activities} activity events.\nTask titles: ${tasks.slice(0, 30).map((t) => t.title).join('; ')}\nReturn JSON: { "summary": string (2-4 sentences), "highlights": string[], "metrics": { "created": number, "completed": number, "activity": number }, "focusAreas": string[], "nextWeek": string }`
    );

    res.json({
      success: true,
      data: {
        summary: data.summary ?? '',
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        metrics: {
          created: Number((data.metrics as Record<string, unknown> | undefined)?.created) || created,
          completed: Number((data.metrics as Record<string, unknown> | undefined)?.completed) || completed,
          activity: Number((data.metrics as Record<string, unknown> | undefined)?.activity) || activities,
        },
        focusAreas: Array.isArray(data.focusAreas) ? data.focusAreas : [],
        nextWeek: data.nextWeek ?? '',
      },
    });
  } catch (err) {
    next(err);
  }
}