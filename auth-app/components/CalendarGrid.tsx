"use client";
import { useEffect, useState } from "react";
import { getJstTodayDate, startOfMonthJst, endOfMonthJst, toISODate } from "../lib/date";
import { useEntries, useCreateEntry } from "../hooks/use-api";

type Props = {
  month?: string; // YYYY-MM-01 (JST)
  today?: string; // YYYY-MM-DD (JST)
  marked?: Set<string>;
  onChange?: () => void;
};

export function CalendarGrid({ month, today = getJstTodayDate(), marked, onChange }: Props) {
  const [todayStatus, setTodayStatus] = useState<"idle" | "loading" | "created" | "exists">("idle");

  // Use SWR to check today's entries
  const { entries } = useEntries();
  const { createEntry, isCreating } = useCreateEntry();

  useEffect(() => {
    // Check if already recorded today using SWR data
    const jst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const iso = jst.toISOString().slice(0, 10);
    const hasToday = entries.some((e: any) => (e.entry_date as string).slice(0, 10) === iso);
    setTodayStatus(hasToday ? "exists" : "idle");
  }, [entries]);
  async function recordToday() {
    if (todayStatus === "loading" || todayStatus === "created" || todayStatus === "exists" || isCreating) return;

    try {
      setTodayStatus("loading");
      const result = await createEntry();
      setTodayStatus(result?.status || "created");
      // SWR will automatically revalidate and trigger onChange if needed
    } catch {
      setTodayStatus("idle");
    }
  }
  const base = month ?? today.slice(0,7) + "-01";
  const start = startOfMonthJst(base);
  const end = endOfMonthJst(base);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const todayIso = toISODate(today);
  const leading = new Date(start).getDay(); // 0=Sun
  return (
    <div className="space-y-3" aria-label="今月のカレンダー">
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-orange-900/70">
        {['日','月','火','水','木','金','土'].map((w)=> (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`lead-${i}`} className="aspect-square" aria-hidden />
        ))}
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = iso === todayIso;
          const isMarked = marked?.has(iso);
          return (
            <button
              key={iso}
              onClick={isToday ? recordToday : undefined}
              className={`tap-target aspect-square rounded-lg text-base sm:text-lg flex items-center justify-center border transition overflow-hidden pt-0.5 pb-1 sm:pt-0 sm:pb-0 ${
                isToday
                  ? `border-orange-300 ${todayStatus === "exists" || todayStatus === "created" ? "bg-orange-100" : "bg-orange-200 hover:bg-green-500 text-white"} text-orange-900`
                  : "border-orange-200 bg-white"
              } ${!isToday ? "opacity-90 cursor-default" : "cursor-pointer"}`}
              disabled={!isToday || todayStatus === "loading" || todayStatus === "created" || todayStatus === "exists"}
              aria-disabled={!isToday}
              aria-label={`${iso}${isToday ? " 今日" : ""}`}
              title={iso}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xl sm:text-2xl">{new Date(iso).getDate()}</span>
                {isToday && (todayStatus === "exists" || todayStatus === "created") ? (
                  <span className="mt-0 sm:mt-0.5 text-base sm:text-lg font-semibold text-orange-900 leading-none">済</span>
                ) : isToday && todayStatus === "loading" ? (
                  <span className="mt-0 sm:mt-0.5 text-base sm:text-lg font-semibold text-orange-900 leading-none">…</span>
                ) : isMarked ? (
                  <span className="mt-0 sm:mt-0.5 text-base sm:text-lg font-semibold text-orange-900 leading-none">済</span>
                ) : (
                  <span className="mt-0 sm:mt-0.5 text-base sm:text-lg font-semibold leading-none opacity-0">済</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

