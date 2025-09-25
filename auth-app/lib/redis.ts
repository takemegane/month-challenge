import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

// Global connection state for serverless persistence
declare global {
  var __redis: RedisClientType | undefined;
}

export async function getRedisClient(): Promise<RedisClientType> {
  // Use global variable for serverless function reuse
  if (!globalThis.__redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }

    logger.debug('Creating new Redis connection');

    globalThis.__redis = createClient({
      url: process.env.REDIS_URL,
      socket: {
        // Connection timeout optimizations
        connectTimeout: 10000, // 10s
        reconnectStrategy: (retries) => {
          if (retries > 3) return false; // Max 3 retries
          return Math.min(retries * 50, 500); // Progressive delay up to 500ms
        }
      },
      // Connection pool-like behavior for serverless
      disableOfflineQueue: false, // Queue commands while connecting
    });

    // Enhanced error handling
    globalThis.__redis.on('error', (err) => {
      logger.error('Redis Client Error', err);
      // Reset connection on critical errors
      if (err.message.includes('connection') || err.message.includes('timeout')) {
        globalThis.__redis = undefined;
      }
    });

    globalThis.__redis.on('connect', () => {
      logger.debug('Redis connected successfully');
    });

    globalThis.__redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Connect with error handling
    try {
      await globalThis.__redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      globalThis.__redis = undefined;
      throw error;
    }
  }

  // Fast return for existing connection
  return globalThis.__redis;
}

export async function closeRedis(): Promise<void> {
  if (globalThis.__redis) {
    try {
      if (globalThis.__redis.isOpen) {
        await globalThis.__redis.quit();
      }
    } catch (error) {
      logger.warn('Error closing Redis connection:', error);
    } finally {
      globalThis.__redis = undefined;
    }
  }
}

// Graceful shutdown for serverless
export function setupRedisCleanup(): void {
  if (typeof process !== 'undefined') {
    process.on('SIGINT', closeRedis);
    process.on('SIGTERM', closeRedis);
    process.on('beforeExit', closeRedis);
  }
}