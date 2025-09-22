import { NextResponse } from "next/server";

function cookieMaxAge(remember?: boolean) {
  return remember ? 60 * 60 * 24 * 30 : 60 * 60 * 2; // 30 days or 2 hours
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const res = NextResponse.redirect(new URL("/admin", url));
  res.cookies.set("admin_access", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieMaxAge(false),
  });
  return res;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = "";
  let remember = false;
  try {
    const body = await req.json();
    token = String(body?.token || "");
    remember = !!body?.remember;
  } catch {}
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_access", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieMaxAge(remember),
  });
  return res;
}
