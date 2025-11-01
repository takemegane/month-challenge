import { NextResponse, type NextRequest } from "next/server";

// Note: Redis cleanup is handled in API routes, not middleware (Webpack compatibility)

const PUBLIC_PATHS = ["/auth/sign-in", "/auth/sign-up", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/me", "/api/health", "/api/cron", "/api/icon", "/manifest.json", "/api/admin/cache-worker", "/api/admin/cache-rebuild", "/api/admin/export-redis"];

export function middleware(req: NextRequest) {
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
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }
  // 軽量チェック（期限切れなどはAPI側で厳密検証）
  return NextResponse.next();
}

export const config = { matcher: "/:path*" };

