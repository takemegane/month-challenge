import { logger } from "./logger";

interface HealthStatus {
  neon: { healthy: boolean; error?: string };
  timestamp: string;
}

let healthCheckCache: { timestamp: number; status: HealthStatus } | null = null;

export async function checkDatabaseHealth(): Promise<HealthStatus> {
  const now = Date.now();

  // Return cached result if less than 30 seconds old
  if (healthCheckCache && (now - healthCheckCache.timestamp) < 30000) {
    return healthCheckCache.status;
  }

  const status: HealthStatus = {
    neon: { healthy: false },
    timestamp: new Date().toISOString(),
  };

  try {
    const { ensureNeonConnection } = await import("./db");
    const sql = await ensureNeonConnection();
    const result = await sql`SELECT 1 as health_check`;
    status.neon.healthy = result.length > 0 && (result[0] as any).health_check === 1;
  } catch (error) {
    status.neon.error = error instanceof Error ? error.message : "Unknown Neon error";
    logger.error("Neon health check failed:", error);
  }

  healthCheckCache = { timestamp: now, status };
  return status;
}
