import { getRangeStart, getJstTodayDate, toISODate } from "../../../lib/date";
import { Heatmap } from "../../../components/Heatmap";
import { headers } from "next/headers";

async function fetchEntries(range: "1m" | "3m" | "6m") {
  try {
    const params = new URLSearchParams({ range, user_id: "me" });
    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const url = `${proto}://${host}/api/entries?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store", headers: { cookie: h.get("cookie") || "" } });
    if (!res.ok) return { entries: [] } as { entries: { entry_date: string }[] };
    return (await res.json()) as { entries: { entry_date: string }[] };
  } catch {
    return { entries: [] } as { entries: { entry_date: string }[] };
  }
}

export default async function ListInner() {
  const today = getJstTodayDate();
  const ranges: ("1m" | "3m" | "6m")[] = ["1m", "3m", "6m"];
  const data = await Promise.all(ranges.map((r) => fetchEntries(r)));

  // Deprecated in favor of SimpleList; keep for reference but return null
  return null as any;
}
