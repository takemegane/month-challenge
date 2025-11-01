import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const dbUrl = process.env.DATABASE_URL_AUTH || "";

  // パスワードを隠す
  const sanitized = dbUrl.replace(/:[^@]+@/, ":****@");

  return NextResponse.json({
    DATABASE_URL_AUTH: sanitized,
    host: dbUrl.match(/@([^/]+)/)?.[1] || "unknown",
  });
}
