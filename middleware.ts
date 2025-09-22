import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = new URL(req.url);
  // Set a CSRF token if missing (double-submit cookie)
  const csrf = req.cookies.get("csrf-token")?.value;
  if (!csrf) {
    const token = crypto.randomUUID();
    res.cookies.set("csrf-token", token, {
      maxAge: 60 * 60 * 24 * 90,
      sameSite: "lax",
      secure: true,
      path: "/",
      httpOnly: false,
    });
  }
  // Protect /admin routes with admin_access cookie
  const path = url.pathname;
  if (path.startsWith("/admin") && !path.startsWith("/admin/access") && !path.startsWith("/admin/logout") && !path.startsWith("/admin/enter")) {
    const access = req.cookies.get("admin_access")?.value;
    if (access !== "1") {
      return new NextResponse("Not Found", { status: 404 });
    }
  }
  return res;
}

export const config = {
  matcher: "/:path*",
};
