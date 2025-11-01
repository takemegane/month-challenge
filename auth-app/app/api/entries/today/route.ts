import { NextResponse } from "next/server";
import { verifyToken } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";
import { getJstTodayDate } from "../../../../lib/date";
import { enqueueDailyStatsDiff } from "../../../../lib/cache-jobs";
import { logger } from "../../../../lib/logger";

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
  const v = verifyToken(decodeURIComponent(m[1]), secret);
  if (!v.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = v.payload?.sub as string;
  const iso = getJstTodayDate();
  try {
    const rows = await query<{ id: string }>`
      insert into auth_entries (user_id, entry_date) values (${uid}, ${iso})
      on conflict (user_id, entry_date) do nothing
      returning id
    `;

    // キャッシュ更新: 新規作成された場合のみDiff Jobをキューに追加
    if (rows.length > 0) {
      try {
        await enqueueDailyStatsDiff({
          userId: uid,
          entryDate: iso,
          action: "add",
          source: "user_entry",
        });
      } catch (cacheError) {
        // キャッシュ更新失敗はログに記録するが、エントリー作成は成功として扱う
        logger.error("Failed to enqueue cache diff job", { uid, iso, error: cacheError });
      }
    }

    return NextResponse.json({ status: rows.length ? 'created' : 'exists' });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
