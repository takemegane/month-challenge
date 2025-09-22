import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { getJstTodayDate } from "../../../../lib/date";
import { rateLimit } from "../../../../lib/rateLimit";
import { isMockMode } from "../../../../lib/runtime";
import { mockAdd } from "../../../../lib/mockStore";

function checkCsrf(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const header = req.headers.get("x-csrf-token");
  const match = /(?:^|; )csrf-token=([^;]+)/.exec(cookie);
  return header && match && header === decodeURIComponent(match[1]);
}

export async function POST(req: Request) {
  if (!checkCsrf(req))
    return NextResponse.json({ error: "CSRF" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown") as string;
  if (!rateLimit(`post-today:${ip}`, 20)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // Neon or mock
  const cookie = req.headers.get("cookie") || "";
  const match = /(?:^|; )user_id=([^;]+)/.exec(cookie);
  const uid = match ? decodeURIComponent(match[1]) : undefined;
  if (!uid) return NextResponse.json({ error: "no_user_selected" }, { status: 400 });
  const today = getJstTodayDate();
  // Try insert with ON CONFLICT DO NOTHING RETURNING id
  const rows = await query<{ id: number }>`
    insert into entries (user_id, entry_date)
    values (${uid}, ${today})
    on conflict (user_id, entry_date) do nothing
    returning id
  `;
  if (rows.length > 0) return NextResponse.json({ status: "created" as const });
  return NextResponse.json({ status: "exists" as const });
}
