import { NextResponse } from "next/server";
import { verifyToken } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ user: null });
  const token = decodeURIComponent(m[1]);
  const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
  const v = verifyToken(token, secret);
  if (!v.valid) return NextResponse.json({ user: null });
  const uid = v.payload?.sub as string;
  const rows = await query<{ id: string; email: string; name: string; is_admin: boolean }>`
    select id, email, name, is_admin from auth_users where id = ${uid}
  `;
  const u = rows[0];
  return NextResponse.json({ user: u || null });
}

