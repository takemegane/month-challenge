import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "../../../../lib/db";
import { verifyPassword, signToken } from "../../../../lib/crypto";
import { ensureAdminSeeded } from "../../../../lib/admin-seed";

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  await ensureAdminSeeded();
  const json = await req.json().catch(()=>null);
  const parse = Body.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: 'bad_request', issues: parse.error.issues }, { status: 400 });
  }
  const { email, password } = parse.data;
  const rows = await query<{ id: string; password_hash: string; name: string; is_admin: boolean }>`
    select id, password_hash, name, is_admin from auth_users where lower(email) = lower(${email})
  `;
  const u = rows[0];
  if (!u) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  if (!verifyPassword(password, u.password_hash)) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
  const token = signToken({ sub: u.id, email, name: u.name, is_admin: u.is_admin, exp: Math.floor(Date.now()/1000) + 60*60*24*30 }, secret);

  if (process.env.NODE_ENV === 'development') {
    console.log("Setting auth cookie for user:", { id: u.id, email, name: u.name });
    console.log("Token length:", token.length);
    console.log("Environment:", process.env.NODE_ENV);
  }

  const res = NextResponse.json({ user: { id: u.id, email, name: u.name, is_admin: u.is_admin } });
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60*60*24*30
  };

  res.cookies.set('auth-token', token, cookieOptions);

  return res;
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed', hint: 'POST /api/auth/login with JSON { email, password }' }, { status: 405 });
}
