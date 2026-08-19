import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Invitation, InviteStatus } from '../models/Invitation.js';
import { Workspace, WorkspaceRole, MemberDoc } from '../models/Workspace.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthRequest } from '../middleware/auth.js';
import { requireRole, CAN_MANAGE, isMember } from '../services/membership.js';
import { sendInviteEmail } from '../services/mail.js';
import { config } from '../config/index.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function inviteUrl(token: string): string {
  return `${config.clientUrl}/invite/${token}`;
}

function serialize(invite: {
  _id: unknown;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: unknown;
}) {
  return {
    id: String(invite._id),
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

export async function createInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, email, role } = req.body;
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('A valid workspaceId is required');
    if (!email || !EMAIL_RE.test(String(email).toLowerCase())) throw ApiError.badRequest('A valid email is required');

    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const norm = String(email).toLowerCase();
    const target = await User.findOne({ email: norm });
    if (target && isMember(ws.members as unknown as MemberDoc[], String(target._id))) {
      throw ApiError.conflict('This person is already a member of the workspace');
    }

    await Invitation.updateMany(
      { workspace: ws._id, email: norm, status: InviteStatus.PENDING },
      { $set: { status: InviteStatus.REVOKED } }
    );

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await Invitation.create({
      workspace: ws._id,
      email: norm,
      role: role ?? WorkspaceRole.MEMBER,
      token,
      invitedBy: req.user!._id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });

    if (!ws.invitedEmails.includes(norm)) {
      ws.invitedEmails.push(norm);
      await ws.save();
    }

    const url = inviteUrl(token);
    const mail = await sendInviteEmail({
      to: norm,
      inviteUrl: url,
      workspaceName: ws.name,
      inviterName: (req.user as { name?: string }).name ?? 'A teammate',
    });

    res.status(201).json({
      success: true,
      data: {
        invite: serialize(invite),
        emailSent: mail.sent,
        emailError: mail.error,
        previewUrl: mail.sent ? undefined : url,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;
    const invite = await Invitation.findOne({ token })
      .populate('workspace', 'name logo')
      .populate('invitedBy', 'name')
      .lean();
    if (!invite) throw ApiError.notFound('This invitation is invalid or no longer exists');

    const ws = invite.workspace as unknown as { _id: Types.ObjectId; name: string; logo: string } | null;
    const inviter = invite.invitedBy as unknown as { name: string } | null;
    if (!ws) throw ApiError.notFound('This invitation is invalid or no longer exists');

    const userExists = await User.exists({ email: invite.email });

    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        expired: invite.expiresAt.getTime() < Date.now(),
        userExists: Boolean(userExists),
        workspace: { id: String(ws._id), name: ws.name, logo: ws.logo },
        inviter: inviter?.name ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;
    const invite = await Invitation.findOne({ token });
    if (!invite) throw ApiError.notFound('This invitation is invalid or no longer exists');
    if (invite.status !== InviteStatus.PENDING) throw ApiError.conflict('This invitation has already been used');
    if (invite.expiresAt.getTime() < Date.now()) throw ApiError.conflict('This invitation has expired');

    const ws = await Workspace.findById(invite.workspace);
    if (!ws) throw ApiError.notFound('Workspace no longer exists');

    if (String((req.user as { email: string }).email).toLowerCase() !== invite.email) {
      throw ApiError.forbidden(`This invitation was sent to ${invite.email}. Sign in with that account to join.`);
    }

    if (isMember(ws.members as unknown as MemberDoc[], String(req.user!._id))) {
      invite.status = InviteStatus.ACCEPTED;
      await invite.save();
      res.json({ success: true, data: { workspaceId: String(ws._id), alreadyMember: true } });
      return;
    }

    ws.members.push({ user: req.user!._id, role: invite.role as WorkspaceRole });
    ws.invitedEmails = (ws.invitedEmails ?? []).filter((e) => e !== invite.email);
    await ws.save();
    await getRedisDel(ws._id);

    invite.status = InviteStatus.ACCEPTED;
    await invite.save();

    res.json({ success: true, data: { workspaceId: String(ws._id) } });
  } catch (err) {
    next(err);
  }
}

export async function listInvites(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) throw ApiError.badRequest('Invalid workspace id');

    const ws = await Workspace.findById(workspaceId);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    const invites = await Invitation.find({
      workspace: ws._id,
      status: InviteStatus.PENDING,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: invites.map((i) => serialize(i)) });
  } catch (err) {
    next(err);
  }
}

export async function revokeInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const invite = await Invitation.findById(id);
    if (!invite) throw ApiError.notFound('Invitation not found');

    const ws = await Workspace.findById(invite.workspace);
    if (!ws) throw ApiError.notFound('Workspace not found');
    requireRole(ws.members as unknown as MemberDoc[], String(req.user!._id), CAN_MANAGE);

    invite.status = InviteStatus.REVOKED;
    await invite.save();

    res.json({ success: true, data: { revoked: true } });
  } catch (err) {
    next(err);
  }
}

async function getRedisDel(_id: Types.ObjectId): Promise<void> {
  const { getRedis, cacheKey } = await import('../config/redis.js');
  await getRedis().del(cacheKey('ws', String(_id))).catch(() => undefined);
}