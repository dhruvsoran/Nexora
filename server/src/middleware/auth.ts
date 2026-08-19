import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserDoc } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken, TokenPayload } from '../services/token';

export interface AuthRequest extends Request {
  user?: UserDoc & { _id: string };
  tokenPayload?: TokenPayload;
}

export async function protect(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
    if (!token) {
      throw ApiError.unauthorized('Missing access token');
    }

    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Access token expired');
      }
      throw ApiError.unauthorized('Invalid access token');
    }

    const user = await User.findById(payload.sub).select('-password');
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status === 'suspended') throw ApiError.forbidden('Your account has been suspended');

    req.user = user as unknown as UserDoc & { _id: string };
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export function adminOnly(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.user && req.user.role === 'admin') {
    next();
    return;
  }
  next(ApiError.forbidden('Admin access required'));
}