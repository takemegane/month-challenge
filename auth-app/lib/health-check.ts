import { getRedisClient } from "./redis";
import { neon } from "@neondatabase/serverless";
import { logger } from "./logger";

interface HealthStatus {
  redis: { healthy: boolean; error?: string };
  neon: { healthy: boolean; error?: string };
  timestamp: string;
}

let lastHealthCheck: HealthStatus | null = null;
let healthCheckCache: { timestamp: number; status: HealthStatus } | null = null;

export async function checkDatabaseHealth(): Promise<HealthStatus> {
  const now = Date.now();

  // Return cached result if less than 30 seconds old
  if (healthCheckCache && (now - healthCheckCache.timestamp) < 30000) {
    return healthCheckCache.status;
  }

  const status: HealthStatus = {
    redis: { healthy: false },
    neon: { healthy: false },
    timestamp: new Date().toISOString()
  };

  // Check Redis health
  try {
    const redis = await getRedisClient();
    const testResult = await redis.ping();
    status.redis.healthy = testResult === 'PONG';
  } catch (error) {
    status.redis.error = error instanceof Error ? error.message : 'Unknown Redis error';
    logger.error('Redis health check failed:', error);
  }

  // Check Neon health
  try {
    const DATABASE_URL = process.env.DATABASE_URL_AUTH;
    if (DATABASE_URL) {
      const sql = neon(DATABASE_URL);
      const result = await sql`SELECT 1 as health_check`;
      status.neon.healthy = result.length > 0 && result[0].health_check === 1;
    }
  } catch (error) {
    status.neon.error = error instanceof Error ? error.message : 'Unknown Neon error';
    logger.error('Neon health check failed:', error);
  }

  // Cache the result
  healthCheckCache = { timestamp: now, status };
  lastHealthCheck = status;

  // Log status changes
  if (lastHealthCheck) {
    if (status.redis.healthy !== lastHealthCheck.redis.healthy) {
      logger.info(`Redis health changed: ${lastHealthCheck.redis.healthy} → ${status.redis.healthy}`);
    }
    if (status.neon.healthy !== lastHealthCheck.neon.healthy) {
      logger.info(`Neon health changed: ${lastHealthCheck.neon.healthy} → ${status.neon.healthy}`);
    }
  }

  return status;
}

export function getLastHealthCheck(): HealthStatus | null {
  return lastHealthCheck;
}

export async function getRecommendedStorage(): Promise<'redis' | 'neon' | 'mock'> {
  const health = await checkDatabaseHealth();

  if (health.redis.healthy) {
    return 'redis';
  } else if (health.neon.healthy) {
    logger.warn('Redis unhealthy, falling back to Neon');
    return 'neon';
  } else {
    logger.error('Both Redis and Neon unhealthy, using mock storage');
    return 'mock';
  }
}