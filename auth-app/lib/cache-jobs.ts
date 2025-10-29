import { query } from "./db";
import { logger } from "./logger";

export type DiffJob = {
  id: string;
  userId: string;
  entryDate: string;
  action: "add" | "remove";
  source: string;
};

type DiffJobRow = {
  id: string;
  user_id: string;
  entry_date: string;
  action: "add" | "remove";
  source: string;
};

export async function enqueueDailyStatsDiff(job: {
  userId: string;
  entryDate: string;
  action: "add" | "remove";
  source: string;
}): Promise<void> {
  await query`
    insert into auth_daily_stats_jobs (user_id, entry_date, action, source)
    values (${job.userId}, ${job.entryDate}, ${job.action}, ${job.source})
  `;
  logger.debug("Enqueued diff job", { job });
}

export async function claimDiffJobs(limit: number): Promise<DiffJob[]> {
  if (limit <= 0) return [];

  const rows = await query<DiffJobRow>`
    with picked as (
      select id
      from auth_daily_stats_jobs
      where status = 'pending'
      order by created_at asc
      limit ${limit}
      for update skip locked
    )
    update auth_daily_stats_jobs
    set status = 'processing',
        locked_at = now(),
        updated_at = now()
    where id in (select id from picked)
    returning id, user_id, entry_date::text as entry_date, action, source
  `;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    action: row.action,
    source: row.source,
  }));
}

export async function markDiffJobDone(id: string): Promise<void> {
  await query`
    update auth_daily_stats_jobs
    set status = 'done',
        locked_at = null,
        updated_at = now(),
        error = null
    where id = ${id}
  `;
}

export async function markDiffJobFailed(id: string, message: string): Promise<void> {
  await query`
    update auth_daily_stats_jobs
    set status = 'failed',
        locked_at = null,
        updated_at = now(),
        error = ${message}
    where id = ${id}
  `;
}

export async function markDiffJobsPending(ids: string[]): Promise<void> {
  for (const id of ids) {
    await query`
      update auth_daily_stats_jobs
      set status = 'pending',
          locked_at = null,
          updated_at = now(),
          error = null
      where id = ${id}
    `;
  }
}

export async function countDiffJobsByStatus(status: "pending" | "processing" | "failed" | "done"): Promise<number> {
  const rows = await query<{ count: number }>`
    select count(*)::int as count
    from auth_daily_stats_jobs
    where status = ${status}
  `;
  return rows[0]?.count ?? 0;
}

export async function releaseStaleJobs(olderThanMinutes: number): Promise<number> {
  const rows = await query<{ count: number }>`
    with updated as (
      update auth_daily_stats_jobs
      set status = 'pending',
          locked_at = null,
          updated_at = now(),
          error = null
      where status = 'processing'
        and locked_at is not null
        and locked_at < now() - make_interval(mins => ${olderThanMinutes})
      returning 1
    )
    select count(*)::int as count from updated
  `;
  return rows[0]?.count ?? 0;
}
