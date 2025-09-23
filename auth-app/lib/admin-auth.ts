import { verifyToken } from "./crypto";
import { query } from "./db";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

type OkResult = { ok: true; user: AdminUser };
type ErrResult = { ok: false; status: number; body: { error: string } };

export async function requireAdmin(req: Request): Promise<OkResult | ErrResult> {
  const cookie = req.headers.get("cookie") || "";
  const match = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!match) {
    return { ok: false, status: 401, body: { error: "unauthorized" } };
  }

  const token = decodeURIComponent(match[1]);
  const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";
  const verification = verifyToken(token, secret);
  if (!verification.valid) {
    return { ok: false, status: 401, body: { error: "unauthorized" } };
  }

  const userId = verification.payload?.sub as string | undefined;
  if (!userId) {
    return { ok: false, status: 401, body: { error: "unauthorized" } };
  }

  const rows = await query<AdminUser>`
    select id, email, name, is_admin from auth_users where id = ${userId}
  `;
  const user = rows[0];
  if (!user) {
    return { ok: false, status: 401, body: { error: "unauthorized" } };
  }
  if (!user.is_admin) {
    return { ok: false, status: 403, body: { error: "admin_required" } };
  }

  return { ok: true, user };
}

