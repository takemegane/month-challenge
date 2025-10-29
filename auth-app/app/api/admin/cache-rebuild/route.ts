import { NextResponse } from "next/server";
import { logger } from "../../../../lib/logger";
import { rebuildMonthlyCache } from "../../../../lib/daily-stats-cache";

const CRON_TOKEN = process.env.ADMIN_CRON_TOKEN;

function authorize(request: Request): boolean {
  if (!CRON_TOKEN) {
    logger.warn("ADMIN_CRON_TOKEN is not set; denying cache-rebuild access");
    return false;
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-cron-token");

  if (!token || token !== CRON_TOKEN) {
    logger.warn("cache-rebuild access denied due to invalid token");
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") || undefined;
  const deadlineParam = url.searchParams.get("deadlineMs");
  const deadlineMs = deadlineParam ? Number(deadlineParam) : undefined;

  const result = await rebuildMonthlyCache(month, deadlineMs);
  return NextResponse.json(result);
}
