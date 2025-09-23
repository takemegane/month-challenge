import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/admin-auth";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  // Get all users
  const users = await query<{ id: string; email: string; name: string; is_admin: boolean }>`
    select id, email, name, is_admin from auth_users order by name
  `;

  return NextResponse.json({ users });
}
