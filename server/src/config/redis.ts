import { Redis } from 'ioredis';
import { config } from './index.js';

let _redis: Redis | null = null;

// Enable TLS only when the URL explicitly uses the rediss:// scheme.
// (Some cloud providers with "db.redis.io" hosts speak plaintext RESP and fail
// TLS handshakes with "packet length too long".)
const needsTls = config.redisUrl.startsWith('rediss://');

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableOfflineQueue: false,
      tls: needsTls ? {} : undefined,
    });
    _redis.on('error', (err) => {
      console.error('[redis] error', err.message);
    });
    _redis.on('connect', () => {
      console.log('[redis] connected');
    });
  }
  return _redis;
}

export async function redisPing(): Promise<boolean> {
  try {
    await getRedis().ping();
    return true;
  } catch {
    return false;
  }
}

export function cacheKey(...parts: (string | number)[]): string {
  return [config.redisPrefix, ...parts].join(':');
}