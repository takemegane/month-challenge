import { createClient, RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }

    redis = createClient({
      url: process.env.REDIS_URL,
    });

    redis.on('error', (err) => console.error('Redis Client Error', err));

    await redis.connect();
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}