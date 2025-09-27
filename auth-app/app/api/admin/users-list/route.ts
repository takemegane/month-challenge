import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { query } from "../../../../lib/db";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  // 軽量なユーザーリスト（チェック操作用）
  const users = await query<{ id: string; name: string; email: string }>`
    select id, name, email from auth_users order by name
  `;

  return NextResponse.json({ users });
}