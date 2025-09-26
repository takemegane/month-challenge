import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { query } from "../../../../../../lib/db";
import { hashPassword, signToken } from "../../../../../../lib/crypto";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(100).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;
  if (!body.name && !body.email && !body.password) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const rows = await query<{ id: string; email: string; name: string; password_hash: string; is_admin: boolean }>`
    select id, email, name, password_hash, is_admin from auth_users where id = ${id}
  `;
  const target = rows[0];
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let nextEmail = target.email;
  if (body.email && body.email !== target.email.toLowerCase()) {
    const existing = await query<{ id: string }>`
      select id from auth_users where lower(email) = lower(${body.email}) and id <> ${id}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    nextEmail = body.email;
  }

  const nextName = body.name ? body.name : target.name;
  const nextPasswordHash = body.password ? hashPassword(body.password) : target.password_hash;

  await query`
    update auth_users
    set name = ${nextName}, email = ${nextEmail}, password_hash = ${nextPasswordHash}
    where id = ${id}
  `;

  const res = NextResponse.json({
    user: { id: target.id, name: nextName, email: nextEmail, is_admin: target.is_admin },
  });

  // If the admin is editing their own profile, update their session token
  if (admin.user.id === id) {
    const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";
    const newToken = signToken(
      {
        sub: target.id,
        email: nextEmail,
        name: nextName,
        is_admin: target.is_admin,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      secret,
    );

    res.cookies.set("auth-token", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
