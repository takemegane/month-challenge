import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "../../../../lib/db";

function assertAdmin(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  return /(?:^|; )admin_access=1(?:;|$)/.test(cookie);
}

const Body = z.object({
  user_id: z.string().uuid(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

export async function POST(req: Request) {
  if (!assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { user_id, entry_date } = parse.data;
  const rows = await query<{ id: number }>`
    insert into entries (user_id, entry_date)
    values (${user_id}, ${entry_date})
    on conflict (user_id, entry_date) do nothing
    returning id
  `;
  return NextResponse.json({ status: rows.length > 0 ? "created" : "exists" });
}

export async function DELETE(req: Request) {
  if (!assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { user_id, entry_date } = parse.data;
  const rows = await query<{ id: number }>`
    delete from entries
    where user_id = ${user_id} and entry_date = ${entry_date}
    returning id
  `;
  return NextResponse.json({ status: rows.length > 0 ? "deleted" : "not_found" });
}
