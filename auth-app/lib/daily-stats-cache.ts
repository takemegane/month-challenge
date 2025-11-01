import { query } from "./db";
import { logger } from "./logger";
import {
  DiffJob,
  markDiffJobDone,
  markDiffJobFailed,
  markDiffJobsPending,
} from "./cache-jobs";

const DEFAULT_REBUILD_DEADLINE_MS = 20_000;
const DAYS_PER_MONTH = 31;

export type DiffApplyResult = {
  processed: number;
  failed: number;
  remaining: number;
};

export type RebuildResult = {
  month: string;
  status: "succeeded" | "partial" | "failed";
  processedUsers?: number;
  message?: string;
};

export async function applyDiffJobs(jobs: DiffJob[], deadlineMs: number): Promise<DiffApplyResult> {
  let processed = 0;
  let failed = 0;
  let remaining = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    if (Date.now() >= deadlineMs) {
      const pendingIds = jobs.slice(i).map((item) => item.id);
      if (pendingIds.length) {
        await markDiffJobsPending(pendingIds);
      }
      remaining = pendingIds.length;
      break;
    }

    try {
      await applySingleDiffJob(job);
      await markDiffJobDone(job.id);
      processed++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      await markDiffJobFailed(job.id, message);
      logger.error("Failed to apply diff job", { job, error: message });
    }
  }

  logger.debug("Diff jobs processed", { processed, failed, remaining });
  return { processed, failed, remaining };
}

export async function rebuildMonthlyCache(month?: string, deadlineMs?: number): Promise<RebuildResult> {
  const targetMonths = month ? [month] : gatherDefaultMonths();
  const deadline = typeof deadlineMs === "number" ? deadlineMs : Date.now() + DEFAULT_REBUILD_DEADLINE_MS;

  let processedUsers = 0;
  let partial = false;

  for (const target of targetMonths) {
    if (Date.now() >= deadline) {
      partial = true;
      break;
    }

    const ok = await rebuildSingleMonth(target, deadline);
    if (!ok) {
      partial = true;
      continue;
    }

    const rows = await query<{ count: number }>`
      select count(*)::int as count from auth_daily_stats_cache where month = ${target}
    `;
    const count = rows[0]?.count ?? 0;
    processedUsers += count;
  }

  return {
    month: month ?? "auto",
    status: partial ? "partial" : "succeeded",
    processedUsers,
  };
}

async function applySingleDiffJob(job: DiffJob): Promise<void> {
  const { entryDate } = job;
  const month = entryDate.slice(0, 7);
  const day = Number(entryDate.slice(8, 10));

  if (!/^\d{4}-\d{2}$/.test(month) || Number.isNaN(day)) {
    throw new Error("invalid_entry_date");
  }

  const dayIndex = day - 1;
  if (dayIndex < 0 || dayIndex >= DAYS_PER_MONTH) {
    throw new Error("day_out_of_range");
  }

  const rows = await query<{
    marked_days: string | null;
    marked_dates: any;
    total: number;
  }>`
    select marked_days, marked_dates, total
    from auth_daily_stats_cache
    where month = ${month} and user_id = ${job.userId}
  `;

  if (rows.length === 0) {
    throw new Error("cache_row_missing");
  }

  const record = rows[0];
  const currentBits = ensureBitString(record.marked_days);
  const currentDates = normalizeDates(record.marked_dates);
  const bitIsSet = currentBits[dayIndex] === "1";

  let delta = 0;
  let updatedBits = currentBits;
  let updatedDates = [...currentDates];

  if (job.action === "add") {
    if (!bitIsSet) {
      updatedBits = setBit(currentBits, dayIndex, true);
      updatedDates.push(entryDate);
      updatedDates = sortUniqueDates(updatedDates);
      delta = 1;
    }
  } else {
    if (bitIsSet) {
      updatedBits = setBit(currentBits, dayIndex, false);
      updatedDates = currentDates.filter((value) => value !== entryDate);
      delta = -1;
    }
  }

  const newTotal = Math.max(0, record.total + delta);

  await query`
    update auth_daily_stats_cache
    set marked_days = ${updatedBits},
        marked_dates = ${updatedDates},
        total = ${newTotal},
        calculated_at = now()
    where month = ${month} and user_id = ${job.userId}
  `;

  if (delta !== 0) {
    await adjustDailyTotal({ month, entryDate, delta });
  }
}

function gatherDefaultMonths(): string[] {
  const now = new Date();
  const current = formatMonth(now);
  const previous = formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  return [current, previous];
}

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function rebuildSingleMonth(month: string, deadlineMs: number): Promise<boolean> {
  const monthMatch = /^\d{4}-\d{2}$/.test(month);
  if (!monthMatch) {
    logger.error("Invalid month for rebuild", { month });
    return false;
  }

  const taskRows = await query<{ status: string }>`
    insert into auth_daily_stats_tasks (month, status)
    values (${month}, 'running')
    on conflict (month) do update
      set status = 'running',
          last_started_at = now(),
          last_error = null
    returning status
  `;

  if (taskRows.length === 0) {
    logger.error("Failed to upsert task row", { month });
    return false;
  }

  try {
    const { start, end } = monthDateRange(month);

    const entries = await query<{
      user_id: string;
      entry_date: string;
    }>`
      select user_id, entry_date::text as entry_date
      from auth_entries
      where entry_date between ${start} and ${end}
      order by user_id, entry_date
    `;

    const groupedByUser = groupEntriesByUser(entries);

    // Note: Neon HTTP driver doesn't support BEGIN/COMMIT/ROLLBACK
    // Using upsert operations which are idempotent
    try {
      await upsertStatsCache(month, groupedByUser);
      await upsertTotalsCache(month, entries);
      await cleanupObsoleteRows(month, groupedByUser);

      if (Date.now() >= deadlineMs) {
        await markTaskPending(month, "timeout");
        return false;
      }

      await markTaskSucceeded(month);
      return true;
    } catch (error) {
      logger.error("Failed to rebuild month", { month, error });
      await markTaskFailed(month, error);
      return false;
    }
  } catch (error) {
    logger.error("Unexpected error rebuilding month", { month, error });
    await markTaskFailed(month, error);
    return false;
  }
}

function monthDateRange(month: string): { start: string; end: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function groupEntriesByUser(entries: Array<{ user_id: string; entry_date: string }>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of entries) {
    if (!map.has(entry.user_id)) {
      map.set(entry.user_id, []);
    }
    map.get(entry.user_id)!.push(entry.entry_date);
  }
  for (const dates of map.values()) {
    dates.sort();
  }
  return map;
}

async function upsertStatsCache(month: string, grouped: Map<string, string[]>) {
  for (const [userId, dates] of grouped.entries()) {
    const markedDays = buildBitMask(dates);
    const total = dates.length;
    await query`
      insert into auth_daily_stats_cache (month, user_id, total, marked_days, marked_dates, calculated_at, source_version)
      values (${month}, ${userId}, ${total}, ${markedDays}, ${dates}, now(), 'rebuild')
      on conflict (month, user_id) do update
        set total = excluded.total,
            marked_days = excluded.marked_days,
            marked_dates = excluded.marked_dates,
            calculated_at = now(),
            source_version = 'rebuild'
    `;
  }
}

async function upsertTotalsCache(month: string, entries: Array<{ entry_date: string }>) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.entry_date, (totals.get(entry.entry_date) || 0) + 1);
  }

  for (const [day, count] of totals.entries()) {
    await query`
      insert into auth_daily_totals_cache (month, day, total, calculated_at, source_version)
      values (${month}, ${day}, ${count}, now(), 'rebuild')
      on conflict (day) do update
        set total = excluded.total,
            calculated_at = now(),
            source_version = 'rebuild'
    `;
  }
}

async function cleanupObsoleteRows(month: string, grouped: Map<string, string[]>) {
  const keepUserIds = Array.from(grouped.keys());
  if (keepUserIds.length === 0) {
    await query`
      delete from auth_daily_stats_cache where month = ${month}
    `;
  } else {
    // Delete rows where user_id is not in the keep list (using individual deletions for simplicity)
    const allRows = await query<{ user_id: string }>`
      select user_id from auth_daily_stats_cache where month = ${month}
    `;
    for (const row of allRows) {
      if (!keepUserIds.includes(row.user_id)) {
        await query`delete from auth_daily_stats_cache where month = ${month} and user_id = ${row.user_id}`;
      }
    }
  }

  const range = monthDateRange(month);
  const validDays = await query<{ entry_date: string }>`
    select distinct entry_date::text as entry_date
    from auth_entries
    where entry_date between ${range.start} and ${range.end}
  `;
  const validDaySet = new Set(validDays.map(r => r.entry_date));

  const cacheDays = await query<{ day: string }>`
    select day::text as day from auth_daily_totals_cache where month = ${month}
  `;
  for (const dayRow of cacheDays) {
    if (!validDaySet.has(dayRow.day)) {
      await query`delete from auth_daily_totals_cache where month = ${month} and day = ${dayRow.day}`;
    }
  }
}

function buildBitMask(dates: string[]): string {
  const bits = Array(DAYS_PER_MONTH).fill("0");
  for (const date of dates) {
    const day = Number(date.slice(8, 10));
    if (!Number.isNaN(day) && day >= 1 && day <= DAYS_PER_MONTH) {
      bits[day - 1] = "1";
    }
  }
  return bits.join("");
}

function ensureBitString(value: string | null | undefined): string {
  const normalized = typeof value === "string" ? value.replace(/[^01]/g, "") : "";
  if (normalized.length >= DAYS_PER_MONTH) {
    return normalized.slice(0, DAYS_PER_MONTH);
  }
  return normalized.padEnd(DAYS_PER_MONTH, "0");
}

function setBit(bits: string, index: number, value: boolean): string {
  if (index < 0 || index >= DAYS_PER_MONTH) {
    return bits;
  }
  const chars = bits.split("");
  chars[index] = value ? "1" : "0";
  return chars.join("");
}

function normalizeDates(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const body = trimmed.slice(1, -1);
      if (!body) return [];
      return body.split(',').map((item) => item.replace(/^\"|\"$/g, ''));
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch (error) {
      logger.warn("Failed to parse marked_dates string", { raw, error });
    }
  }
  return [];
}

function sortUniqueDates(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort();
}

async function adjustDailyTotal(params: { month: string; entryDate: string; delta: number }) {
  const { month, entryDate, delta } = params;
  try {
    const rows = await query<{ total: number }>`
      update auth_daily_totals_cache
      set total = total + ${delta},
          calculated_at = now(),
          source_version = 'diff'
      where month = ${month} and day = ${entryDate}
      returning total
    `;

    if (rows.length === 0) {
      if (delta > 0) {
        await query`
          insert into auth_daily_totals_cache (month, day, total, calculated_at, source_version)
          values (${month}, ${entryDate}, ${delta}, now(), 'diff')
          on conflict (day)
          do update set total = auth_daily_totals_cache.total + ${delta},
                        calculated_at = now(),
                        source_version = 'diff'
        `;
      }
      return;
    }

    const total = rows[0].total;
    if (total <= 0) {
      await query`
        delete from auth_daily_totals_cache
        where month = ${month} and day = ${entryDate}
      `;
    }
  } catch (error) {
    logger.error("Failed to adjust daily totals", { month, entryDate, delta, error });
  }
}

async function markTaskPending(month: string, reason: string) {
  await query`
    update auth_daily_stats_tasks
    set status = 'pending',
        last_finished_at = now(),
        last_error = ${reason}
    where month = ${month}
  `;
}

async function markTaskSucceeded(month: string) {
  await query`
    update auth_daily_stats_tasks
    set status = 'succeeded',
        last_finished_at = now(),
        last_error = null
    where month = ${month}
  `;
}

async function markTaskFailed(month: string, error: unknown) {
  await query`
    update auth_daily_stats_tasks
    set status = 'failed',
        last_finished_at = now(),
        last_error = ${String(error)}
    where month = ${month}
  `;
}
