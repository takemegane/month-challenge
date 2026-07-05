import { NextResponse } from "next/server";
import { verifyToken, getSessionSecret } from "../../../../lib/crypto";
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
  const secret = getSessionSecret();
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
    const ym = entry_date.slice(0, 7); // 'YYYY-MM'（entry_date は JST 日付文字列）
    const [yy, mm] = ym.split('-').map(Number);
    const lastDay = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    const monthStart = `${ym}-01`;
    const monthEnd = `${ym}-${String(lastDay).padStart(2, '0')}`;

    // トグル（あれば削除・なければ追加）と、確定後のその月の entries 取得を
    // 1クエリで行う（GET /api/entries と同形の応答。クライアントはこれを正本とする）。
    // データ変更CTEの結果は本体のselectから見えないため、
    // 「変更前スナップショット − 削除分 ∪ 追加分」で確定後の状態を組み立てる。
    const entries = await query<{ entry_date: string }>`
      with del as (
        delete from auth_entries
        where user_id = ${uid} and entry_date = ${entry_date}
        returning entry_date
      ), ins as (
        insert into auth_entries (user_id, entry_date)
        select ${uid}, ${entry_date}
        where not exists (
          select 1 from auth_entries where user_id = ${uid} and entry_date = ${entry_date}
        )
        on conflict (user_id, entry_date) do nothing
        returning entry_date
      )
      select entry_date::text as entry_date from (
        select entry_date from auth_entries
        where user_id = ${uid}
          and entry_date between ${monthStart} and ${monthEnd}
          and entry_date not in (select entry_date from del)
        union
        select entry_date from ins
      ) t
      order by entry_date asc
    `;

    // トグル対象日が確定後の一覧に含まれていれば追加、いなければ削除
    const status: 'added' | 'removed' = entries.some((e) => e.entry_date === entry_date)
      ? 'added'
      : 'removed';

    return NextResponse.json({ status, entries });
  } catch (error) {
    logger.error('Error toggling entry:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
