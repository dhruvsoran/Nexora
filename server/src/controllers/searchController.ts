import { Request, Response, NextFunction } from 'express';
import { Workspace, MemberDoc } from '../models/Workspace';
import { Board } from '../models/Board';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export async function globalSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ success: true, data: { boards: [], tasks: [], users: [] } });
      return;
    }

    const workspaces = await Workspace.find({ 'members.user': req.user!._id }).select('_id members').lean();
    const workspaceIds = workspaces.map((w) => w._id);

    const sharedUserIds = new Set<string>();
    for (const w of workspaces) {
      for (const m of w.members) {
        if (String(m.user) !== String(req.user!._id)) sharedUserIds.add(String(m.user));
      }
    }

    const [boards, tasks, users] = await Promise.all([
      Board.find({ workspace: { $in: workspaceIds }, archived: false, $text: { $search: q } })
        .select('name key color workspace')
        .limit(10)
        .lean(),
      Task.find({ workspace: { $in: workspaceIds }, $text: { $search: q } })
        .select('title board columnId priority labels')
        .limit(20)
        .lean(),
      sharedUserIds.size
        ? User.find({ _id: { $in: [...sharedUserIds] }, $text: { $search: q } }).select('name email avatar').limit(10).lean()
        : Promise.resolve([]),
    ]);

    res.json({
      success: true,
      data: {
        boards,
        tasks,
        users,
      },
    });
  } catch (err) {
    next(err);
  }
}