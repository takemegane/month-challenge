// Redis-based icon storage for production persistence
import { Redis } from '@upstash/redis'

// In-memory cache for performance
let iconCache: Record<string, string> = {};

// Redis client initialization
let redis: Redis | null = null;

function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    try {
      // Parse Redis URL to extract credentials
      const url = new URL(process.env.REDIS_URL);
      const host = url.hostname;
      const port = url.port;
      const password = url.password;

      // Create Redis client with URL format for Upstash and shorter timeout
      redis = new Redis({
        url: `https://${host}`,
        token: password,
        retry: {
          retries: 1,
          backoff: () => 500
        }
      });
      console.log('Redis client initialized successfully');
    } catch (error) {
      console.log('Redis initialization failed:', error);
    }
  }
  return redis;
}

export async function setIcon(size: string, base64Data: string) {
  const key = `icon-${size}`;
  iconCache[key] = base64Data;

  // Store in Redis for production persistence with timeout
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      // Add timeout to Redis operation
      await Promise.race([
        redisClient.set(`pwa-icons:${key}`, base64Data),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 2000)
        )
      ]);
      console.log(`Icon ${size} cached to Redis for persistence`);
    } catch (error) {
      console.log('Failed to cache icon to Redis:', error);
    }
  }

  // Fallback to file system for local development
  if (!redisClient) {
    try {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(process.cwd(), '.icon-cache.json');
      const fileCache = { ...iconCache };
      fs.writeFileSync(cacheFile, JSON.stringify(fileCache, null, 2));
      console.log('Icons cached to file for local development');
    } catch (error) {
      console.log('Failed to write icon cache file:', error);
    }
  }
}

export async function getIcon(size: string): Promise<string | null> {
  const key = `icon-${size}`;

  // First check memory cache
  if (iconCache[key]) {
    return iconCache[key];
  }

  // Try Redis for production persistence with timeout
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      const cached = await Promise.race([
        redisClient.get(`pwa-icons:${key}`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 2000)
        )
      ]);
      if (cached && typeof cached === 'string') {
        iconCache[key] = cached;
        return cached;
      }
    } catch (error) {
      console.log('Failed to read from Redis:', error);
    }
  }

  // Fallback to file cache for local development
  if (!redisClient) {
    try {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(process.cwd(), '.icon-cache.json');
      if (fs.existsSync(cacheFile)) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        iconCache = { ...iconCache, ...cached };
        return iconCache[key] || null;
      }
    } catch (error) {
      console.log('Failed to read icon cache file:', error);
    }
  }

  return null;
}

export async function hasIcons(): Promise<boolean> {
  if (Object.keys(iconCache).length > 0) {
    return true;
  }

  // Check Redis for icons with timeout
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      const keys = await Promise.race([
        redisClient.keys('pwa-icons:icon-*'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 2000)
        )
      ]);
      return (keys as string[]).length > 0;
    } catch (error) {
      console.log('Failed to check Redis keys:', error);
    }
  }

  // Fallback to file cache check
  try {
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), '.icon-cache.json');
    return fs.existsSync(cacheFile);
  } catch (error) {
    return false;
  }
}

export async function clearIcons() {
  iconCache = {};

  // Clear Redis cache
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      const keys = await redisClient.keys('pwa-icons:icon-*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log('Cleared icon cache from Redis');
      }
    } catch (error) {
      console.log('Failed to clear Redis cache:', error);
    }
  }

  // Clear file cache
  try {
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), '.icon-cache.json');
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } catch (error) {
    console.log('Failed to delete icon cache file:', error);
  }
}