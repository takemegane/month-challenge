import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "../../../../lib/db";
import { hashPassword, signToken } from "../../../../lib/crypto";

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  name: z.string().trim().min(1).max(100),
});

export async function POST(req: Request) {
  const json = await req.json().catch(()=>null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { email, password, name } = parse.data;
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = admins.includes(email.toLowerCase());
  const pass = hashPassword(password);
  try {
    const rows = await query<{ id: string }>`
      insert into auth_users (email, password_hash, name, is_admin)
      values (${email}, ${pass}, ${name}, ${isAdmin})
      returning id
    `;
    const user_id = rows[0]?.id;
    const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
    const token = signToken({ sub: user_id, email, name, is_admin: isAdmin, exp: Math.floor(Date.now()/1000) + 60*60*24*30 }, secret);
    const res = NextResponse.json({ user: { id: user_id, email, name, is_admin: isAdmin } });
    res.cookies.set('auth-token', token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60*60*24*30 });
    return res;
  } catch (e: any) {
    if ((e?.message || '').includes('duplicate key')) return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed', hint: 'POST /api/auth/register with JSON { email, password, name }' }, { status: 405 });
}
