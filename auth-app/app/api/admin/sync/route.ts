import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { getRedisClient } from "../../../../lib/redis";
import { neon } from "@neondatabase/serverless";
import { logger } from "../../../../lib/logger";

const DATABASE_URL = process.env.DATABASE_URL_AUTH;

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  if (!DATABASE_URL) {
    return NextResponse.json({ error: 'Neon not configured' }, { status: 500 });
  }

  try {
    logger.info('Starting Redis → Neon sync...');
    const redis = await getRedisClient();
    const sql = neon(DATABASE_URL);

    let syncStats = {
      users: { synced: 0, skipped: 0, errors: 0 },
      entries: { synced: 0, skipped: 0, errors: 0 }
    };

    // Sync Users
    logger.info('Syncing users...');
    const userKeys = await redis.keys('user:*');

    for (const key of userKeys) {
      try {
        const userData = await redis.hGetAll(key);
        if (!userData.id) continue;

        // Check if user exists in Neon
        const existing = await sql`
          SELECT id FROM auth_users WHERE id = ${userData.id}
        `;

        if (existing.length === 0) {
          // Insert new user
          await sql`
            INSERT INTO auth_users (id, email, password_hash, name, is_admin)
            VALUES (${userData.id}, ${userData.email}, ${userData.password_hash}, ${userData.name}, ${userData.is_admin === 'true'})
          `;
          syncStats.users.synced++;
        } else {
          // Update existing user
          await sql`
            UPDATE auth_users
            SET email = ${userData.email}, password_hash = ${userData.password_hash},
                name = ${userData.name}, is_admin = ${userData.is_admin === 'true'}
            WHERE id = ${userData.id}
          `;
          syncStats.users.synced++;
        }
      } catch (error) {
        logger.error(`Error syncing user ${key}:`, error);
        syncStats.users.errors++;
      }
    }

    // Sync Entries
    logger.info('Syncing entries...');
    const entryKeys = await redis.keys('entry:*');

    for (const key of entryKeys) {
      try {
        const entryData = await redis.hGetAll(key);
        if (!entryData.id) continue;

        // Check if entry exists in Neon
        const existing = await sql`
          SELECT id FROM auth_entries WHERE user_id = ${entryData.user_id} AND entry_date = ${entryData.entry_date}
        `;

        if (existing.length === 0) {
          // Insert new entry
          await sql`
            INSERT INTO auth_entries (id, user_id, entry_date, created_at)
            VALUES (${entryData.id}, ${entryData.user_id}, ${entryData.entry_date}, ${entryData.created_at})
          `;
          syncStats.entries.synced++;
        } else {
          syncStats.entries.skipped++;
        }
      } catch (error) {
        logger.error(`Error syncing entry ${key}:`, error);
        syncStats.entries.errors++;
      }
    }

    logger.info('Sync completed:', syncStats);

    return NextResponse.json({
      status: 'success',
      message: 'Sync completed successfully',
      stats: syncStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Sync failed:', error);
    return NextResponse.json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  try {
    const redis = await getRedisClient();
    const userCount = await redis.keys('user:*');
    const entryCount = await redis.keys('entry:*');

    return NextResponse.json({
      status: 'healthy',
      redis: {
        users: userCount.length,
        entries: entryCount.length,
        connected: true
      },
      neon: {
        configured: !!DATABASE_URL
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}