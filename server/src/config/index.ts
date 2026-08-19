import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: required('CLIENT_ORIGIN', 'http://localhost:5173'),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  appName: process.env.APP_NAME ?? 'Nexora',

  mongodbUri: required('MONGODB_URI'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),
  redisPrefix: process.env.REDIS_PREFIX ?? 'nexora:',

  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  geminiApiKey: process.env.GEMINI_API_KEY,

  agora: {
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
    aiPrompt:
      process.env.AGORA_AI_PROMPT ??
      'You are Nexora AI, a friendly project-management assistant. Help the user plan work, summarize tasks, and stay productive. Keep answers short and clear.',
  },

  sessionSecret: required('SESSION_SECRET'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024),

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'Nexora <noreply@nexora.app>',
  },
} as const;

export const isProduction = config.env === 'production';
export const mailEnabled = Boolean(config.smtp.host && config.smtp.user);