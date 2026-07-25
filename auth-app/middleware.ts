import { NextResponse, type NextRequest } from "next/server";
import { verifyTokenEdge } from "./lib/edge-token";

// Note: Redis cleanup is handled in API routes, not middleware (Webpack compatibility)

const PUBLIC_PATHS = ["/auth/sign-in", "/auth/sign-up", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/me", "/api/health", "/api/icon", "/manifest.json", "/api/admin/cache-worker", "/api/admin/cache-rebuild"];

// fetch から呼ばれる API にログイン画面の HTML を返しても解釈できないので、
// 画面遷移はリダイレクト、API は 401 JSON と使い分ける。
// staleToken が true のときは、無効な Cookie を残すと再訪しても同じ中途半端な
// 状態が続いてしまうため削除する。
function rejectUnauthenticated(req: NextRequest, path: string, staleToken: boolean): NextResponse {
  const res = path.startsWith("/api/")
    ? NextResponse.json({ error: "unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/auth/sign-in", req.url));
  if (staleToken) {
    res.cookies.set("auth-token", "", { path: "/", maxAge: 0 });
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Skip middleware for static assets and Next.js internals
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/static/') ||
    path.includes('.') && (
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.ico') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.gif') ||
      path.endsWith('.svg') ||
      path.endsWith('.webp') ||
      path.endsWith('.woff') ||
      path.endsWith('.woff2') ||
      path.endsWith('.ttf') ||
      path.endsWith('.eot')
    ) ||
    PUBLIC_PATHS.some(p => path.startsWith(p))
  ) {
    return NextResponse.next();
  }
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    return rejectUnauthenticated(req, path, false);
  }

  // 存在チェックだけだと、期限切れ・改ざんされた Cookie を持ったまま
  // 保護ページが表示されてしまうため、署名と有効期限まで検証する。
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    // 秘密鍵が読めない環境では検証しようがない。ここで全リクエストを弾くと
    // サイト全体が止まるので、従来どおり通す（API 側で厳密検証される）。
    return NextResponse.next();
  }

  try {
    if (!(await verifyTokenEdge(token, secret))) {
      return rejectUnauthenticated(req, path, true);
    }
  } catch {
    // 検証自体が想定外に失敗した場合、締め出すとサイトが使えなくなるため
    // 従来の挙動（通過）に倒す。認可は各 API 側でも検証される。
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = { matcher: "/:path*" };

