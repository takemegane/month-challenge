import { NextResponse } from "next/server";
import { isMockMode } from "../../../../lib/runtime";
import { mockAdd } from "../../../../lib/mockStore";

function jstISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(req: Request) {
  if (!isMockMode()) return NextResponse.json({ error: "not_mock" }, { status: 400 });
  const cookie = req.headers.get("cookie") || "";
  const match = /(?:^|; )mock_uid=([^;]+)/.exec(cookie);
  const uid = match ? decodeURIComponent(match[1]) : "mock-public";

  const today = new Date();
  // Seed last ~90 days with a pattern
  let created = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Simple pattern: mark 40% of days, ensure today is marked
    const mark = i === 0 || ((d.getDate() % 3) === 0) || (Math.random() < 0.4);
    if (mark) {
      const res = mockAdd(uid, jstISO(d));
      if (res === "created") created++;
    }
  }
  return NextResponse.json({ ok: true, created });
}

