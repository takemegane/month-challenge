import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, hashPassword, signToken } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  current_password: z.string().min(8).max(100).optional(),
  new_password: z.string().min(8).max(100).optional(),
});

function getToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function PUT(req: Request) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";
  const { verifyToken } = await import("../../../../lib/crypto");
  const verification = verifyToken(token, secret);
  if (!verification.valid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = verification.payload?.sub as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });
  }

  const body = parsed.data;
  if (body.name === undefined && body.email === undefined && !body.new_password) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const rows = await query<{ id: string; email: string; name: string; password_hash: string; is_admin: boolean }>`
    select id, email, name, password_hash, is_admin from auth_users where id = ${userId}
  `;
  const current = rows[0];
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const wantsEmailChange = body.email !== undefined && body.email !== current.email.toLowerCase();
  const wantsPasswordChange = !!body.new_password;
  const mustCheckPassword = wantsEmailChange || wantsPasswordChange;

  if (mustCheckPassword) {
    if (!body.current_password) {
      return NextResponse.json({ error: "current_password_required" }, { status: 400 });
    }
    if (!verifyPassword(body.current_password, current.password_hash)) {
      return NextResponse.json({ error: "invalid_current_password" }, { status: 400 });
    }
  }

  if (wantsEmailChange) {
    const existing = await query<{ id: string }>`
      select id from auth_users where lower(email) = lower(${body.email}) and id <> ${userId}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
  }

  const nextName = body.name !== undefined ? body.name : current.name;
  const nextEmail = body.email !== undefined ? body.email : current.email.toLowerCase();
  const nextPasswordHash = body.new_password ? hashPassword(body.new_password) : current.password_hash;

  console.log('Profile update debug:', {
    userId,
    bodyName: body.name,
    bodyEmail: body.email,
    currentName: current.name,
    currentEmail: current.email,
    nextName,
    nextEmail
  });

  const updateResult = await query`
    update auth_users
    set name = ${nextName}, email = ${nextEmail}, password_hash = ${nextPasswordHash}
    where id = ${userId}
  `;

  console.log('Update result:', updateResult);

  const newToken = signToken(
    {
      sub: current.id,
      email: nextEmail,
      name: nextName,
      is_admin: current.is_admin,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    },
    secret,
  );

  const res = NextResponse.json({
    user: { id: current.id, email: nextEmail, name: nextName, is_admin: current.is_admin },
  });
  res.cookies.set("auth-token", newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
