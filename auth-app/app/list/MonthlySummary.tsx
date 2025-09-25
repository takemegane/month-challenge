"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEntries } from "../../hooks/use-api";


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
  const router = useRouter(); // key: YYYY-MM

  const months = useMemo(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const list: Date[] = [];
    const span = 6;
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      list.push(firstOfMonth(d));
    }
    return list;
  }, []);

  // Calculate date range for SWR query
  const { since, until } = useMemo(() => {
    if (months.length === 0) return { since: '', until: '' };
    const sinceDate = firstOfMonth(months[0]);
    const untilDate = lastOfMonth(months[months.length - 1]);
    const pad = (n: number) => String(n).padStart(2, "0");
    const since = `${sinceDate.getFullYear()}-${pad(sinceDate.getMonth() + 1)}-01`;
    const until = `${untilDate.getFullYear()}-${pad(untilDate.getMonth() + 1)}-${pad(untilDate.getDate())}`;
    return { since, until };
  }, [months]);

  // Use SWR for data fetching with caching
  const { entries, isLoading, isError } = useEntries(undefined, since, until);

  // Aggregate entries by month
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const dstr = String(e.entry_date).slice(0, 7); // YYYY-MM
      map[dstr] = (map[dstr] || 0) + 1;
    }
    return map;
  }, [entries]);

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="text-orange-900/70">読み込み中...</div>
      ) : isError ? (
        <div className="text-red-600">読み込みに失敗しました</div>
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