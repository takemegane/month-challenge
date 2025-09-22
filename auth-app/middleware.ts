import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/sign-in", "/auth/sign-up", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/me"];

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }
  // 軽量チェック（期限切れなどはAPI側で厳密検証）
  return NextResponse.next();
}

export const config = { matcher: "/:path*" };

