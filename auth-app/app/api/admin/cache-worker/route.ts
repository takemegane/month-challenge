import { NextResponse } from "next/server";
import { logger } from "../../../../lib/logger";
import {
  claimDiffJobs,
  countDiffJobsByStatus,
  releaseStaleJobs,
} from "../../../../lib/cache-jobs";
import { applyDiffJobs } from "../../../../lib/daily-stats-cache";

const CRON_TOKEN = process.env.ADMIN_CRON_TOKEN;

function authorize(request: Request): boolean {
  if (!CRON_TOKEN) {
    logger.warn("ADMIN_CRON_TOKEN is not set; denying cache-worker access");
    return false;
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-cron-token");

  if (!token || token !== CRON_TOKEN) {
    logger.warn("cache-worker access denied due to invalid token");
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const released = await releaseStaleJobs(10);

  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 200, 1), 500);
  const deadline = Date.now() + 20_000;

  const jobs = await claimDiffJobs(limit);
  if (jobs.length === 0) {
    const pending = await countDiffJobsByStatus("pending");
    const failed = await countDiffJobsByStatus("failed");
    return NextResponse.json({ status: "idle", released, pending, failed });
  }

  const result = await applyDiffJobs(jobs, deadline);
  const pending = await countDiffJobsByStatus("pending");
  const failed = await countDiffJobsByStatus("failed");

  return NextResponse.json({ status: "ok", ...result, released, pending, failed });
}
