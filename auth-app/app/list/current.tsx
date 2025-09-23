import { headers } from "next/headers";

function jstMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function CurrentMonthCount() {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const month = jstMonth();
  const url = `${proto}://${host}/api/entries?month=${month}`;
  let count = 0;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { cookie: h.get("cookie") || "" } });
    if (res.ok) {
      const json = await res.json();
      count = Array.isArray(json.entries) ? json.entries.length : 0;
    }
  } catch {}
  const label = `${new Date().getMonth() + 1}月 ${count}件`;
  return (
    <div className="text-lg font-medium text-orange-900/90" aria-live="polite">{label}</div>
  );
}