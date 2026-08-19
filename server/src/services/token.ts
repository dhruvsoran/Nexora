import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface TokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti } as TokenPayload, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtl,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti } as TokenPayload, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}