import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET(req: Request) {
  const dbUrl = process.env.DATABASE_URL_AUTH || "";

  // パスワードを隠す
  const sanitized = dbUrl.replace(/:[^@]+@/, ":****@");

  // 実際のクエリを実行してユーザー数を確認
  let userCount = 0;
  let sampleUserId = "";
  try {
    const users = await query<{ id: string; count: number }>`SELECT id FROM auth_users LIMIT 1`;
    sampleUserId = users[0]?.id || "none";
    const countResult = await query<{ count: number }>`SELECT COUNT(*)::int as count FROM auth_users`;
    userCount = countResult[0]?.count || 0;
  } catch (error) {
    // エラーは無視
  }

  return NextResponse.json({
    DATABASE_URL_AUTH: sanitized,
    host: dbUrl.match(/@([^/]+)/)?.[1] || "unknown",
    database: dbUrl.match(/\/([^?]+)/)?.[1] || "unknown",
    userCount,
    sampleUserId,
  });
}
