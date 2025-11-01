import { NextResponse } from "next/server";
import { getRedisClient } from "../../../../lib/redis";

const CRON_TOKEN = process.env.ADMIN_CRON_TOKEN;

function authorize(request: Request): boolean {
  if (!CRON_TOKEN) return false;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  return token === CRON_TOKEN;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const redis = await getRedisClient();

    // Export all users
    const userKeys = await redis.keys("user:*");
    const users = [];
    for (const key of userKeys) {
      const user = await redis.hGetAll(key);
      if (user.id) {
        users.push({
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          is_admin: user.is_admin === "true",
        });
      }
    }

    // Export all entries
    const entryKeys = await redis.keys("entry:*");
    const entries = [];
    for (const key of entryKeys) {
      const entry = await redis.hGetAll(key);
      if (entry.id) {
        entries.push({
          id: entry.id,
          user_id: entry.user_id,
          entry_date: entry.entry_date,
          created_at: entry.created_at,
        });
      }
    }

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      users_count: users.length,
      entries_count: entries.length,
      users,
      entries,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "export_failed", message: String(error) },
      { status: 500 }
    );
  }
}
