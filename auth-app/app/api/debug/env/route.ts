import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET(req: Request) {
  const dbUrl = process.env.DATABASE_URL_AUTH || "";

  // パスワードを隠す
  const sanitized = dbUrl.replace(/:[^@]+@/, ":****@");

  // 実際のクエリを実行してユーザー数を確認
  let userCount = 0;
  let sampleUserId = "";
  let allUserIds: string[] = [];
  let errorMsg = "";
  try {
    const users = await query<{ id: string }>`SELECT id FROM auth_users LIMIT 5`;
    allUserIds = users.map(u => String(u.id));
    sampleUserId = users[0]?.id || "none";
    const countResult = await query<{ count: string | number }>`SELECT COUNT(*) as count FROM auth_users`;
    userCount = Number(countResult[0]?.count) || 0;
  } catch (error) {
    errorMsg = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json({
    DATABASE_URL_AUTH: sanitized,
    host: dbUrl.match(/@([^/]+)/)?.[1] || "unknown",
    database: dbUrl.split('/').pop()?.split('?')[0] || "unknown",
    userCount,
    sampleUserId,
    allUserIds,
    errorMsg: errorMsg || undefined,
  });
}
