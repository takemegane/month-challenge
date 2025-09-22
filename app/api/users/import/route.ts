import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

function isAdmin(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  return /(?:^|; )admin_access=1(?:;|$)/.test(cookie);
}

async function insertOne(name: string) {
  const rows = await query<{ id: string }>`
    insert into users (name) values (${name})
    on conflict (name) do nothing
    returning id
  `;
  return rows.length > 0;
}

function parseNamesFromText(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let raw of lines) {
    if (!raw) continue;
    // Support simple CSV: take the first column, strip quotes
    let cell = raw.split(",")[0] ?? raw;
    cell = cell.trim().replace(/^\"|\"$/g, "");
    if (!cell || /^(name|名前)$/i.test(cell)) continue; // skip header
    out.push(cell);
  }
  return out;
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    let names: string[] = [];
    const ctype = req.headers.get("content-type") || "";
    try {
      if (ctype.includes("application/json")) {
        const body = await req.json();
        const arr: unknown[] = Array.isArray((body as any)?.names) ? (body as any).names : [];
        names = arr.map((s: unknown) => String(s ?? "").trim()).filter(Boolean);
      } else if (ctype.includes("multipart/form-data")) {
        const fd = await (req as any).formData?.();
        const file = fd?.get("file") as File | null;
        const text = (await file?.text()) || "";
        names = parseNamesFromText(text);
      } else {
        const text = await req.text();
        names = parseNamesFromText(text);
      }
    } catch {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // Basic validation and dedupe
    names = Array.from(new Set(names)).filter((n) => n.length > 0 && n.length <= 100);
    if (names.length === 0) {
      return NextResponse.json({ error: "no_data" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    for (const n of names) {
      try {
        const ok = await insertOne(n);
        if (ok) created++; else skipped++;
      } catch (e) {
        skipped++;
      }
    }
    return NextResponse.json({ total: names.length, created, skipped });
  } catch (e) {
    console.error("/api/users/import failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
