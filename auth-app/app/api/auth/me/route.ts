import { NextResponse } from "next/server";
import { verifyToken, getSessionSecret } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";

// 認証できない場合は 401 を返す。200 で { user: null } を返すと SWR が
// 「成功」と解釈してしまい、クライアント側でログアウトを検知できない。
function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';

  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) {
    if (process.env.NODE_ENV === 'development') {
      console.log("No auth-token found in cookies");
    }
    return unauthorized();
  }

  const token = decodeURIComponent(m[1]);
  const secret = getSessionSecret();
  const v = verifyToken(token, secret);

  if (!v.valid) {
    if (process.env.NODE_ENV === 'development') {
      console.log("Invalid token, returning 401");
    }
    return unauthorized();
  }

  const uid = v.payload?.sub as string;
  const rows = await query<{ id: string; email: string; name: string; is_admin: boolean }>`
    select id, email, name, is_admin from auth_users where id = ${uid}
  `;
  const u = rows[0];

  if (process.env.NODE_ENV === 'development') {
    console.log("Found user:", u ? { id: u.id, email: u.email, name: u.name } : "null");
  }

  // トークンは正しいがユーザーが削除済みのケース。セッションとしては無効。
  if (!u) {
    return unauthorized();
  }

  return NextResponse.json({ user: u });
}
