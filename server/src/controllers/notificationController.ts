import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export async function myNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await Notification.find({ user: req.user!._id })
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const unread = await Notification.countDocuments({ user: req.user!._id, read: false });

    res.json({ success: true, data: { notifications, unread } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ids } = req.body;
    const list = Array.isArray(ids) ? ids : [ids];
    await Notification.updateMany(
      { user: req.user!._id, _id: { $in: list } },
      { $set: { read: true } }
    );
    res.json({ success: true, data: { updated: list.length } });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await Notification.updateMany({ user: req.user!._id, read: false }, { $set: { read: true } });
    res.json({ success: true, data: { updated: true } });
  } catch (err) {
    next(err);
  }
}