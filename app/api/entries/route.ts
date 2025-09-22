import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "../../../lib/db";
import { getRangeStart, getJstTodayDate } from "../../../lib/date";
import { isMockMode } from "../../../lib/runtime";
import { mockList } from "../../../lib/mockStore";

const Query = z.object({
  range: z.enum(["1m", "3m", "6m"]).default("1m"),
  user_id: z.string().default("me"),
  format: z.enum(["json", "csv"]).optional(),
  since: z.string().optional(), // YYYY-MM-DD
  until: z.string().optional(), // YYYY-MM-DD
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parse = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parse.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { range, user_id, format, since: qsSince, until: qsUntil, month } = parse.data;

  if (isMockMode()) {
    const cookie = req.headers.get("cookie") || "";
    const match = /(?:^|; )user_id=([^;]+)/.exec(cookie);
    const cookieUid = match ? decodeURIComponent(match[1]) : "public";
    const targetUser = user_id === "me" ? cookieUid : user_id;
    let since = getRangeStart(range);
    let until = getJstTodayDate();
    if (qsSince && qsUntil) {
      since = qsSince;
      until = qsUntil;
    } else if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(new Date(start.getFullYear(), start.getMonth() + 1, 0));
      const pad = (n: number) => String(n).padStart(2, "0");
      since = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
      until = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    }
    const entries = mockList(targetUser, since, until);
    if (format === "csv") {
      const rows = ["entry_date", ...entries.map((d) => d.entry_date)].join("\n");
      return new NextResponse(rows, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename=entries_${targetUser}_${range}.csv`,
        },
      });
    }
    return NextResponse.json({ entries });
  }

  // Neon: identify user from cookie or explicit user_id
  const cookie = req.headers.get("cookie") || "";
  const match = /(?:^|; )user_id=([^;]+)/.exec(cookie);
  const cookieUid = match ? decodeURIComponent(match[1]) : undefined;
  const targetUser = user_id === "me" ? cookieUid : user_id;
  if (!targetUser) return NextResponse.json({ error: "no_user_selected" }, { status: 400 });
  let since = getRangeStart(range);
  let until = getJstTodayDate();
  if (qsSince && qsUntil) {
    since = qsSince;
    until = qsUntil;
  } else if (month) {
    // Month bounds (JST date strings)
    const start = new Date(`${month}-01`);
    const end = new Date(new Date(start.getFullYear(), start.getMonth() + 1, 0));
    const pad = (n: number) => String(n).padStart(2, "0");
    since = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(1)}`;
    until = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  }

  const rows = await query<{ entry_date: string }>`
    select to_char(entry_date, 'YYYY-MM-DD') as entry_date
    from entries
    where user_id = ${targetUser}
      and entry_date >= ${since}
      and entry_date <= ${until}
    order by entry_date desc
  `;

  if (format === "csv") {
    const rowsCsv = ["entry_date", ...(rows?.map((d) => d.entry_date) || [])].join("\n");
    return new NextResponse(rowsCsv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=entries_${targetUser}_${range}.csv`,
      },
    });
  }

  return NextResponse.json({ entries: rows ?? [] });
}
