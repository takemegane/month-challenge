import { NextResponse } from "next/server";
import { verifyToken } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";
import { getJstTodayDate } from "../../../../lib/date";
import { logger } from "../../../../lib/logger";
import { z } from "zod";

const Q = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
  const v = verifyToken(decodeURIComponent(m[1]), secret);
  if (!v.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = v.payload?.sub as string;

  let body;
  try {
    body = await req.json();
  } catch(e) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parse = Q.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }

  const entry_date = parse.data.entry_date;
  const todayIso = getJstTodayDate();

  if (entry_date > todayIso) {
    return NextResponse.json({ error: 'future_date_not_allowed' }, { status: 400 });
  }

  try {
    // 既存のエントリーを確認
    const existingEntries = await query<{ id: string }>`
      select id from auth_entries where user_id = ${uid} and entry_date = ${entry_date}
    `;

    let status: 'added' | 'removed';

    if (existingEntries.length > 0) {
      // 存在する場合は取り消し（削除）
      await query`delete from auth_entries where user_id = ${uid} and entry_date = ${entry_date}`;
      status = 'removed';
    } else {
      // 存在しない場合は追加
      await query`
        insert into auth_entries (user_id, entry_date) values (${uid}, ${entry_date})
        on conflict (user_id, entry_date) do nothing
      `;
      status = 'added';
    }

    // 当該トグル後に確定したその月の entries を返す（GET /api/entries と同形）。
    // クライアントはこれを唯一の正本としてキャッシュ確定する。
    const ym = entry_date.slice(0, 7); // 'YYYY-MM'（entry_date は JST 日付文字列）
    const [yy, mm] = ym.split('-').map(Number);
    const lastDay = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    const monthStart = `${ym}-01`;
    const monthEnd = `${ym}-${String(lastDay).padStart(2, '0')}`;

    const entries = await query<{ entry_date: string }>`
      select entry_date::text as entry_date
      from auth_entries
      where user_id = ${uid} and entry_date between ${monthStart} and ${monthEnd}
      order by entry_date asc
    `;

    return NextResponse.json({ status, entries });
  } catch (error) {
    logger.error('Error toggling entry:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
