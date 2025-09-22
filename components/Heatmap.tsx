import { eachDayOfInterval } from "date-fns";
import { toISODate } from "../lib/date";

type Props = {
  since: string; // YYYY-MM-DD (JST)
  until: string; // YYYY-MM-DD (JST)
  markedDates: Set<string>; // ISO date
};

export function Heatmap({ since, until, markedDates }: Props) {
  const days = eachDayOfInterval({ start: new Date(since), end: new Date(until) });
  return (
    <div className="grid grid-cols-14 gap-1" aria-label="ヒートマップ">
      {days.map((d) => {
        const iso = toISODate(d);
        const has = markedDates.has(iso);
        const cls = has ? "bg-gradient-to-br from-orange-400 to-orange-600" : "bg-orange-200";
        return (
          <div
            key={iso}
            className={`h-3.5 w-3.5 rounded-sm ${cls}`}
            title={iso}
          />
        );
      })}
    </div>
  );
}
