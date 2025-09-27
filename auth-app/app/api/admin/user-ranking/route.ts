import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../lib/admin-auth";
import { query } from "../../../../lib/db";

const Params = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

function getMonthRange(input?: string) {
  const now = new Date();
  const base = input ? new Date(`${input}-01T00:00:00Z`) : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const month = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, startStr, endStr, start, end };
}

function normalizeDate(value: any): string {
  if (!value) return "";
  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const url = new URL(req.url);
  const params = Params.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!params.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { month: monthParam } = params.data;
  const { month, startStr, endStr, start, end } = getMonthRange(monthParam);

  const users = await query<{ id: string; name: string; email: string; is_admin: boolean }>`
    select id, name, email, is_admin from auth_users order by name
  `;

  const entryRows = await query<{ user_id: string; entry_date: string }>`
    select user_id, entry_date from auth_entries where entry_date between ${startStr} and ${endStr} order by entry_date asc
  `;

  const entriesByUser = new Map<string, string[]>();

  for (const row of entryRows) {
    const date = normalizeDate(row.entry_date);
    if (!entriesByUser.has(row.user_id)) {
      entriesByUser.set(row.user_id, []);
    }
    entriesByUser.get(row.user_id)!.push(date);
  }

  const userSummaries = users.map((user) => {
    const dates = entriesByUser.get(user.id) || [];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
      total: dates.length,
      dates,
    };
  });

  // ランキング用にソート
  userSummaries.sort((a, b) => {
    if (b.total === a.total) return a.name.localeCompare(b.name);
    return b.total - a.total;
  });

  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  return NextResponse.json({
    month,
    range: { start: startStr, end: endStr },
    users: userSummaries,
    days
  });
}