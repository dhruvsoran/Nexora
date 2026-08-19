import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Workspace, MemberDoc } from '../models/Workspace';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { isMember, requireRole, CAN_MANAGE } from '../services/membership';
import { getPlan, PLANS } from '../services/plans';
import { recordAudit } from '../services/audit';
import { AuditAction } from '../models/AuditLog';

export async function plans(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: PLANS });
}

export async function getSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    if (!Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('Invalid workspace id');
    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    if (!isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      throw ApiError.forbidden();
    }

    res.json({
      success: true,
      data: {
        plan: ws.subscription?.plan ?? 'free',
        status: ws.subscription?.status ?? 'active',
        startsAt: ws.subscription?.startsAt ?? new Date(),
        endsAt: ws.subscription?.endsAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function subscribe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const { plan } = req.body;
    const chosen = getPlan(plan);
    if (!chosen) throw ApiError.badRequest('Invalid plan');

    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    // Billing is not wired up yet — plans are unlocked for everyone by choice.
    // A payment gateway (e.g. Stripe) can be added here later without UI changes.
    ws.subscription = {
      plan: chosen.id,
      status: 'active',
      startsAt: new Date(),
      endsAt: null,
    };
    await ws.save();

    await recordAudit(
      String(req.user!._id),
      AuditAction.SUBSCRIPTION_CHANGED,
      'workspace',
      String(ws._id),
      `Subscribed to ${chosen.name}`
    );

    res.json({ success: true, data: { subscription: ws.subscription } });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    ws.subscription = { plan: 'free', status: 'canceled', startsAt: new Date(), endsAt: null };
    await ws.save();
    await recordAudit(String(req.user!._id), AuditAction.SUBSCRIPTION_CHANGED, 'workspace', String(ws._id), 'Canceled subscription');

    res.json({ success: true, data: { subscription: ws.subscription } });
  } catch (err) {
    next(err);
  }
}