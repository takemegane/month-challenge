import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "../../../lib/crypto";
import { query } from "../../../lib/db";

const Q = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = Object.fromEntries(url.searchParams.entries());
  const parse = Q.safeParse(qs);
  if (!parse.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const v = verifyToken(decodeURIComponent(m[1]), process.env.AUTH_SESSION_SECRET || 'dev-secret');
  if (!v.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = v.payload?.sub as string;

  let start: Date; let end: Date;
  if (parse.data.month) {
    start = new Date(`${parse.data.month}-01`);
    end = new Date(start.getFullYear(), start.getMonth()+1, 0);
  } else if (parse.data.since && parse.data.until) {
    start = new Date(parse.data.since); end = new Date(parse.data.until);
  } else {
    // default: current month JST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth()+1, 0);
  }
  const s = start.toISOString().slice(0,10);
  const e = end.toISOString().slice(0,10);
  const rows = await query<{ entry_date: string }>`
    select entry_date from auth_entries where user_id = ${uid} and entry_date between ${s} and ${e} order by entry_date asc
  `;
  return NextResponse.json({ entries: rows });
}

