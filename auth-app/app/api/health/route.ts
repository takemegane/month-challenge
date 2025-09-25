import { NextResponse } from "next/server";
import { checkDatabaseHealth, getRecommendedStorage } from "../../../lib/health-check";

export async function GET(req: Request) {
  try {
    const health = await checkDatabaseHealth();
    const recommendedStorage = await getRecommendedStorage();

    const overall = health.redis.healthy || health.neon.healthy;

    return NextResponse.json({
      status: overall ? 'healthy' : 'unhealthy',
      databases: health,
      recommendation: {
        storage: recommendedStorage,
        fallbackActive: !health.redis.healthy && health.neon.healthy
      },
      system: {
        environment: process.env.NODE_ENV,
        redisConfigured: !!process.env.REDIS_URL,
        neonConfigured: !!process.env.DATABASE_URL_AUTH
      },
      connections: {
        redis: {
          pooled: !!globalThis.__redis,
          status: globalThis.__redis ? 'reused' : 'not_initialized'
        },
        neon: {
          pooled: !!globalThis.__neonClient,
          status: globalThis.__neonClient ? 'reused' : 'not_initialized'
        }
      }
    }, {
      status: overall ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}