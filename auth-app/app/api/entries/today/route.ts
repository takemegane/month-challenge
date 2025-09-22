import { NextResponse } from "next/server";
import { verifyToken } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
  const v = verifyToken(decodeURIComponent(m[1]), secret);
  if (!v.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = v.payload?.sub as string;
  const today = new Date();
  const jst = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const iso = jst.toISOString().slice(0,10);
  try {
    const rows = await query<{ id: string }>`
      insert into auth_entries (user_id, entry_date) values (${uid}, ${iso})
      on conflict (user_id, entry_date) do nothing
      returning id
    `;
    return NextResponse.json({ status: rows.length ? 'created' : 'exists' });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

