import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, isProduction } from './config';
import { errorHandler, notFound } from './middleware/error';

import authRoutes from './routes/authRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import boardRoutes from './routes/boardRoutes';
import chatRoutes from './routes/chatRoutes';
import aiRoutes from './routes/aiRoutes';
import uploadRoutes from './routes/uploadRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import searchRoutes from './routes/searchRoutes';
import agoraRoutes from './routes/agoraRoutes';
import milestoneRoutes from './routes/milestoneRoutes';
import inviteRoutes from './routes/inviteRoutes';
import adminRoutes from './routes/adminRoutes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (!isProduction) app.use(morgan('dev'));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', globalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api', boardRoutes);
  app.use('/api', chatRoutes);
  app.use('/api', aiRoutes);
  app.use('/api', uploadRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api', searchRoutes);
  app.use('/api', agoraRoutes);
  app.use('/api', milestoneRoutes);
  app.use('/api', inviteRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}