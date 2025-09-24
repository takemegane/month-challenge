import { NextResponse } from "next/server";
import { getRedisClient } from "../../../../lib/redis";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL_AUTH;
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!DATABASE_URL) {
    console.error('DATABASE_URL not configured for cron sync');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    console.log(`[${new Date().toISOString()}] Starting scheduled Redis → Neon sync...`);
    const redis = await getRedisClient();
    const sql = neon(DATABASE_URL);

    let syncStats = {
      users: { synced: 0, errors: 0 },
      entries: { synced: 0, errors: 0 }
    };

    // Sync Users (upsert operation)
    const userKeys = await redis.keys('user:*');
    for (const key of userKeys) {
      try {
        const userData = await redis.hGetAll(key);
        if (!userData.id) continue;

        await sql`
          INSERT INTO auth_users (id, email, password_hash, name, is_admin)
          VALUES (${userData.id}, ${userData.email}, ${userData.password_hash}, ${userData.name}, ${userData.is_admin === 'true'})
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            is_admin = EXCLUDED.is_admin
        `;
        syncStats.users.synced++;
      } catch (error) {
        console.error(`Error syncing user ${key}:`, error);
        syncStats.users.errors++;
      }
    }

    // Sync Entries (insert only new ones)
    const entryKeys = await redis.keys('entry:*');
    for (const key of entryKeys) {
      try {
        const entryData = await redis.hGetAll(key);
        if (!entryData.id) continue;

        await sql`
          INSERT INTO auth_entries (id, user_id, entry_date, created_at)
          VALUES (${entryData.id}, ${entryData.user_id}, ${entryData.entry_date}, ${entryData.created_at})
          ON CONFLICT (user_id, entry_date) DO NOTHING
        `;
        syncStats.entries.synced++;
      } catch (error) {
        console.error(`Error syncing entry ${key}:`, error);
        syncStats.entries.errors++;
      }
    }

    console.log(`[${new Date().toISOString()}] Scheduled sync completed:`, syncStats);

    return NextResponse.json({
      status: 'success',
      message: 'Scheduled sync completed',
      stats: syncStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled sync failed:', error);
    return NextResponse.json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}