import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/token.js';
import { getRedis, cacheKey } from '../config/redis.js';
import { config } from '../config/index.js';
import { recordAudit } from '../services/audit.js';
import { AuditAction } from '../models/AuditLog.js';

const REFRESH_TOKEN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setTokens(res: Response, userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = signAccessToken(userId, randomUUID());
  const refreshToken = signRefreshToken(userId, randomUUID());

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSecure ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_AGE_MS,
    path: '/api/auth',
  });

  return { accessToken, refreshToken };
}

function publicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  bio?: string;
  role?: string;
  status?: string;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? '',
    title: user.title ?? '',
    bio: user.bio ?? '',
    role: user.role ?? 'user',
    status: user.status ?? 'active',
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw ApiError.badRequest('name, email and password are required');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw ApiError.badRequest('Invalid email address');
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) throw ApiError.conflict('Email is already registered');

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    const { accessToken, refreshToken } = setTokens(res, String(user._id));
    await recordAudit(String(user._id), AuditAction.USER_REGISTERED, 'user', String(user._id), 'Registered account');

    res.status(201).json({
      success: true,
      data: { user: publicUser(user), accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw ApiError.badRequest('email and password are required');

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw ApiError.unauthorized('Invalid email or password');

    if (user.status === 'suspended') throw ApiError.forbidden('Your account has been suspended');

    await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });
    const { accessToken, refreshToken } = setTokens(res, String(user._id));
    await recordAudit(String(user._id), AuditAction.LOGIN, 'user', String(user._id), 'Logged in');

    res.json({
      success: true,
      data: { user: publicUser(user), accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw ApiError.unauthorized('No refresh token');

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const redis = getRedis();
    const blacklisted = await redis
      .get(cacheKey('token', 'blacklist', payload.jti))
      .catch(() => null);
    if (blacklisted) throw ApiError.unauthorized('Refresh token has been revoked');

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('User no longer exists');

    await redis
      .set(cacheKey('token', 'blacklist', payload.jti), '1', 'EX', REFRESH_TOKEN_AGE_MS / 1000)
      .catch(() => undefined);
    const { accessToken, refreshToken } = setTokens(res, String(user._id));

    res.json({
      success: true,
      data: { user: publicUser(user), accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await getRedis()
          .set(cacheKey('token', 'blacklist', payload.jti), '1', 'EX', REFRESH_TOKEN_AGE_MS / 1000)
          .catch(() => undefined);
      } catch {
        // ignore invalid token on logout
      }
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) throw ApiError.unauthorized();
    res.json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) throw ApiError.notFound('User not found');

    const { name, title, bio, avatar } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) throw ApiError.badRequest('Name cannot be empty');
      user.name = name.trim().slice(0, 80);
    }
    if (title !== undefined) user.title = String(title).slice(0, 80);
    if (bio !== undefined) user.bio = String(bio).slice(0, 500);
    if (avatar !== undefined) {
      if (typeof avatar !== 'string') throw ApiError.badRequest('Invalid avatar');
      user.avatar = avatar;
    }
    await user.save();
    await recordAudit(String(req.user!._id), AuditAction.USER_UPDATED, 'user', String(user._id), 'Updated profile');

    res.json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
}