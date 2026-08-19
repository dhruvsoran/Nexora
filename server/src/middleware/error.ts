import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { config } from '../config';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL';
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    code = 'VALIDATION';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = 'Invalid id format';
    code = 'BAD_REQUEST';
  } else if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
    status = 409;
    message = 'Duplicate value';
    code = 'CONFLICT';
  } else if (err instanceof Error) {
    if (config.env !== 'production') {
      message = err.message;
    }
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    message,
    code,
    ...(config.env === 'development' && details !== undefined ? { details } : {}),
  });
}