"use client";
import { useMemo, useState, useEffect } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { getJstTodayDate } from "../lib/date";
import { CalendarGrid } from "./CalendarGrid";

function firstOfMonth(dateStr: string) {
  return dateStr.slice(0, 7) + "-01";
}

function addMonths(base: string, diff: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function CalendarView({ initialMonth }: { initialMonth?: string }) {
  const today = getJstTodayDate();
  const [month, setMonth] = useState<string>(initialMonth ? firstOfMonth(initialMonth) : firstOfMonth(today));
  const monthLabel = useMemo(() => formatInTimeZone(new Date(month), "Asia/Tokyo", "yyyy年M月"), [month]);
  const thisMonth = firstOfMonth(today);
  const sixMonthsAgo = addMonths(thisMonth, -6);
  const canNext = month < thisMonth; // disable moving to future months
  const canPrev = month > sixMonthsAgo; // disable moving more than 6 months back
  const [count, setCount] = useState<number>(0);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const headerTitle = useMemo(() => {
    if (month === thisMonth) return "今月の件数";
    const m = new Date(month).getMonth() + 1;
    return `${m}月の件数`;
  }, [month, thisMonth]);

  async function fetchMonthData(m: string) {
    const d = new Date(m);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
    const params = new URLSearchParams({ since: start, until: end });
    const res = await fetch(`/api/entries?${params}`, { cache: "no-store", credentials: 'include' });
    if (!res.ok) { setCount(0); setMarked(new Set()); return; }
    const json = await res.json();
    const entries = Array.isArray(json.entries) ? json.entries : [];
    setCount(entries.length);
    setMarked(new Set(entries.map((e: any) => String(e.entry_date).slice(0,10))));
  }

  useMemo(() => { fetchMonthData(month); return undefined; }, [month]);

  // Update month when initialMonth changes (e.g., when navigating from list)
  useEffect(() => {
    if (initialMonth) setMonth(firstOfMonth(initialMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMonth]);

  return (
    <div className="space-y-4">
      {/* PC版: 従来のレイアウト */}
      <div className="hidden sm:flex items-center justify-between">
        <button
          className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="前の月"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          disabled={!canPrev}
        >
          ← 前の月
        </button>
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold text-orange-900/90 whitespace-nowrap">{headerTitle}: {count} 件</div>
          <div className="mt-1 font-semibold text-orange-900/90 text-2xl">{monthLabel}</div>
        </div>
        <button
          className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="次の月"
          onClick={() => setMonth((m) => addMonths(m, +1))}
          disabled={!canNext}
        >
          次の月 →
        </button>
      </div>

      {/* スマホ版: コンパクトレイアウト */}
      <div className="sm:hidden space-y-2">
        <div className="text-2xl font-bold text-orange-900/90 text-center">{headerTitle}: {count} 件</div>
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-800 text-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="前の月"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            disabled={!canPrev}
          >
            ←
          </button>
          <div className="font-semibold text-orange-900/90 text-xl px-2">{monthLabel}</div>
          <button
            className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-800 text-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="次の月"
            onClick={() => setMonth((m) => addMonths(m, +1))}
            disabled={!canNext}
          >
            →
          </button>
        </div>
      </div>
      <CalendarGrid
        month={month}
        today={today}
        marked={marked}
        onChange={() => { fetchMonthData(month); }}
      />
    </div>
  );
}

