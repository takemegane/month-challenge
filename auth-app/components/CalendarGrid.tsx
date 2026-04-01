"use client";
import { useState } from "react";
import { getJstTodayDate, startOfMonthJst, endOfMonthJst, toISODate } from "../lib/date";
import { useToggleEntry } from "../hooks/use-api";

type Props = {
  month?: string; // YYYY-MM-01 (JST)
  today?: string; // YYYY-MM-DD (JST)
  marked?: Set<string>;
  onChange?: () => void;
};

export function CalendarGrid({ month, today = getJstTodayDate(), marked, onChange }: Props) {
  const { toggleEntry, isToggling } = useToggleEntry();
  const [actingDate, setActingDate] = useState<string | null>(null);

  async function handleToggle(iso: string) {
    if (isToggling) return;
    try {
      setActingDate(iso);
      await toggleEntry({ entry_date: iso });
      if (onChange) onChange();
    } catch (e) {
      console.error(e);
    } finally {
      setActingDate(null);
    }
  }

  const base = month ?? today.slice(0,7) + "-01";
  const start = startOfMonthJst(base);
  const end = endOfMonthJst(base);
  const days: Date[] = [];
  for (let d = new Date(start.getTime()); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }
  const todayIso = toISODate(today);
  const leading = start.getUTCDay(); // 0=Sun

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
          const isFuture = iso > todayIso;
          
          const isMarked = marked?.has(iso) ?? false;
          const isActing = actingDate === iso && isToggling;

          return (
            <button
              key={iso}
              onClick={!isFuture ? () => handleToggle(iso) : undefined}
              className={`tap-target aspect-square rounded-lg text-base sm:text-lg flex items-center justify-center border transition overflow-hidden pt-0.5 pb-1 sm:pt-0 sm:pb-0 ${
                isToday
                  ? `border-orange-300 ${isMarked ? "bg-orange-100 hover:bg-orange-200" : "bg-orange-200 hover:bg-green-500"} text-orange-900`
                  : isFuture
                    ? "border-orange-100 bg-gray-50 text-gray-400 opacity-60 cursor-not-allowed"
                    : `border-orange-200 ${isMarked ? "bg-orange-50 hover:bg-orange-100" : "bg-white hover:bg-orange-50 text-orange-900 cursor-pointer"}`
              } ${isFuture ? "opacity-60" : "cursor-pointer"} ${isActing ? "opacity-70 pointer-events-none" : ""}`}
              disabled={isFuture || isToggling}
              aria-disabled={isFuture || isToggling}
              aria-label={`${iso}${isToday ? " 今日" : ""}`}
              title={iso}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className={`text-xl sm:text-2xl ${isFuture ? 'text-gray-400' : ''}`}>{new Date(iso).getDate()}</span>
                {isActing ? (
                  <span className="mt-0 sm:mt-0.5 text-base sm:text-2xl font-semibold text-orange-900 leading-none">…</span>
                ) : isMarked ? (
                  <img
                    src="/api/icon/icon-192"
                    alt="完了"
                    className={`mt-0 sm:mt-0.5 w-4 h-4 sm:w-8 sm:h-8 rounded ${isToday ? '' : 'opacity-80'}`}
                  />
                ) : (
                  <div className="mt-0 sm:mt-0.5 w-4 h-4 sm:w-8 sm:h-8"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
