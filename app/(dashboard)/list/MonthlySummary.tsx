"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type R = "3m" | "6m";

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmtMonth(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}
function keyMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlySummary() {
  const router = useRouter();
  const [range] = useState<R>("6m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({}); // key: YYYY-MM

  const months = useMemo(() => {
    const now = new Date();
    const list: Date[] = [];
    const span = range === "3m" ? 3 : 6;
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      list.push(firstOfMonth(d));
    }
    return list;
  }, [range]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch single range and aggregate client-side
      const sinceDate = firstOfMonth(months[0]);
      const untilDate = lastOfMonth(months[months.length - 1]);
      const pad = (n: number) => String(n).padStart(2, "0");
      const since = `${sinceDate.getFullYear()}-${pad(sinceDate.getMonth() + 1)}-01`;
      const until = `${untilDate.getFullYear()}-${pad(untilDate.getMonth() + 1)}-${pad(untilDate.getDate())}`;
      const params = new URLSearchParams({ user_id: "me", since, until });
      const res = await fetch(`/api/entries?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("読み込みに失敗しました");
      const json = await res.json();
      const entries: { entry_date: string }[] = Array.isArray(json.entries) ? json.entries : [];
      const map: Record<string, number> = {};
      for (const e of entries) {
        const dstr = String(e.entry_date).slice(0, 7); // YYYY-MM
        map[dstr] = (map[dstr] || 0) + 1;
      }
      setCounts(map);
    } catch (e: any) {
      setCounts({});
      setError(e.message || "エラー");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (months.length) load(); /* eslint-disable-next-line */ }, [range, months.length]);

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="text-orange-900/70">読み込み中...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-2">
          {months.map((d) => {
            const k = keyMonth(d);
            const label = fmtMonth(d);
            const c = counts[k] || 0;
            return (
              <button
                key={k}
                onClick={() => router.push(`/calendar?month=${k}`)}
                className="w-full text-left flex items-center justify-between rounded-lg border border-orange-200 bg-white px-4 py-3 hover:bg-orange-50 transition"
              >
                <span className="font-medium text-orange-950">{label}</span>
                <span className="text-lg font-semibold text-orange-900">{c}件</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
