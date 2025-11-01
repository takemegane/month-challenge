import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/admin-auth";
import { logger } from "../../../../lib/logger";
import { enqueueDailyStatsDiff } from "../../../../lib/cache-jobs";

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const body = await req.json();
  const { user_id, entry_date } = body;

  if (!user_id || !entry_date) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  try {
    // First check if entry already exists
    const existingEntries = await query<{ id: string }>`
      select id from auth_entries where user_id = ${user_id} and entry_date = ${entry_date}
    `;

    if (existingEntries.length > 0) {
      return NextResponse.json({ status: 'exists' });
    }

    // Create new entry
    const rows = await query<{ id: string }>`
      insert into auth_entries (user_id, entry_date) values (${user_id}, ${entry_date})
      returning id
    `;

    // キャッシュ更新: エントリー作成時にDiff Jobをキューに追加
    if (rows.length > 0) {
      try {
        await enqueueDailyStatsDiff({
          userId: user_id,
          entryDate: entry_date,
          action: "add",
          source: "admin_entry",
        });
      } catch (cacheError) {
        logger.error("Failed to enqueue cache diff job", { user_id, entry_date, error: cacheError });
      }
    }

    return NextResponse.json({ status: 'created' });
  } catch (error) {
    logger.error('Error creating entry:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const body = await req.json();
  const { user_id, entry_date } = body;

  if (!user_id || !entry_date) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  try {
    // First check if entry exists
    const existingEntries = await query<{ id: string }>`
      select id from auth_entries where user_id = ${user_id} and entry_date = ${entry_date}
    `;

    if (existingEntries.length === 0) {
      return NextResponse.json({ status: 'not_found', message: 'チェックが見つかりません' });
    }

    // Delete the entry
    await query`delete from auth_entries where user_id = ${user_id} and entry_date = ${entry_date}`;

    // キャッシュ更新: エントリー削除時にDiff Jobをキューに追加
    try {
      await enqueueDailyStatsDiff({
        userId: user_id,
        entryDate: entry_date,
        action: "remove",
        source: "admin_entry",
      });
    } catch (cacheError) {
      logger.error("Failed to enqueue cache diff job for deletion", { user_id, entry_date, error: cacheError });
    }

    return NextResponse.json({ status: 'deleted' });
  } catch (error) {
    logger.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
