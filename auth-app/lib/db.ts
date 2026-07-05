import { logger } from "./logger";

const DATABASE_URL = process.env.DATABASE_URL_AUTH || process.env.DATABASE_URL;

// Global Neon client for serverless function reuse
declare global {
  var __neonClient: (<T>(strings: TemplateStringsArray, ...values: any[]) => Promise<T[]>) | undefined;
}

async function getNeonClient() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL_AUTH (or DATABASE_URL) is not set");
  }

  if (!globalThis.__neonClient) {
    logger.debug("Creating new Neon client");
    try {
      const { neon } = await import("@neondatabase/serverless");
      globalThis.__neonClient = neon(DATABASE_URL, {
        arrayMode: false,
        fullResults: false,
      });
    } catch (error) {
      logger.error("Failed to create Neon client:", error);
      globalThis.__neonClient = undefined;
      throw error;
    }
  }

  return globalThis.__neonClient;
}

// Used by lib/health-check.ts for the /api/health probe.
export async function ensureNeonConnection() {
  return getNeonClient();
}

export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const client = await getNeonClient();
  try {
    return (await client(strings, ...values)) as T[];
  } catch (error) {
    logger.error("Neon query failed, resetting connection:", error);
    globalThis.__neonClient = undefined;
    throw error;
  }
}
