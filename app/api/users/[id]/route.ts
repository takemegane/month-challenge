import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { query } from "../../../../lib/db";

function isAdmin(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  return /(?:^|; )admin_access=1(?:;|$)/.test(cookie);
}

const Params = z.object({ id: z.string().uuid() });

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdmin(_req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    // Prefer route params, but also fallback to URL parsing for safety
    const urlId = (() => {
      try { return new URL(_req.url).pathname.split("/").pop() || undefined; } catch { return undefined; }
    })();
    const routeParams = await context.params;
    const p = Params.safeParse({ id: routeParams?.id ?? urlId });
    if (!p.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const userId = p.data.id;
    const rows = await query<{ id: string }>`
      delete from users where id = ${userId} returning id
    `;
    if (rows.length === 0) return NextResponse.json({ status: "not_found" }, { status: 404 });
    return NextResponse.json({ status: "deleted" });
  } catch (e: any) {
    console.error("DELETE /api/users/[id] failed", e?.message || e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ブラウザやプリフェッチが誤ってGETアクセスした場合に、
// アプリのHTML 404ではなくJSONを返すようにする（ノイズ防止）。
export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function HEAD() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
