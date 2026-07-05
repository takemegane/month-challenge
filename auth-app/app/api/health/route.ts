import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "../../../lib/health-check";

export async function GET(req: Request) {
  try {
    const health = await checkDatabaseHealth();

    return NextResponse.json({
      status: health.neon.healthy ? 'healthy' : 'unhealthy',
      databases: health,
      connections: {
        neon: {
          pooled: !!globalThis.__neonClient,
          status: globalThis.__neonClient ? 'reused' : 'not_initialized'
        }
      }
    }, {
      status: health.neon.healthy ? 200 : 503,
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
