import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthRequest } from '../middleware/auth.js';
import { uploadBuffer, UploadedFile } from '../services/cloudinary.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-wav',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const type = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME.has(type)) {
      cb(new ApiError(400, 'Unsupported file type') as never);
      return;
    }
    cb(null, true);
  },
});

export function uploadMiddleware() {
  return upload.single('file');
}

export async function uploadFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) throw ApiError.badRequest('No file provided');
    const folder = `nexora/${String(req.user!._id)}/${randomUUID()}`;
    const file: UploadedFile = await uploadBuffer(req.file.buffer, folder);
    file.name = req.file.originalname;
    res.status(201).json({ success: true, data: { file } });
  } catch (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(ApiError.badRequest('File is too large'));
      return;
    }
    next(err);
  }
}