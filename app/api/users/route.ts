import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "../../../lib/db";

export async function GET() {
  const rows = await query<{ id: string; name: string }>`
    select id, name from users order by name asc
  `;
  return NextResponse.json({ users: rows });
}

const Body = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: Request) {
  // Require admin_access cookie instead of header token
  const cookie = req.headers.get("cookie") || "";
  const hasAccess = /(?:^|; )admin_access=1(?:;|$)/.test(cookie);
  if (!hasAccess) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const json = await req.json();
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const rows = await query<{ id: string }>`
    insert into users (name) values (${parse.data.name}) returning id
  `;
  return NextResponse.json({ id: rows[0]?.id });
}
