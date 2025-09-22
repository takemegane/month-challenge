import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const JST = "Asia/Tokyo";

export function nowJst(): Date {
  return toZonedTime(new Date(), JST);
}

export function getJstTodayDate(): string {
  return formatInTimeZone(new Date(), JST, "yyyy-MM-dd");
}

export function toISODate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return formatInTimeZone(date, JST, "yyyy-MM-dd");
}

export function startOfMonthJst(anyDate: string | Date): Date {
  const d = typeof anyDate === "string" ? new Date(anyDate) : anyDate;
  const iso = formatInTimeZone(d, JST, "yyyy-MM-01");
  return new Date(iso);
}

export function endOfMonthJst(anyDate: string | Date): Date {
  const d = typeof anyDate === "string" ? new Date(anyDate) : anyDate;
  const year = parseInt(formatInTimeZone(d, JST, "yyyy"));
  const month = parseInt(formatInTimeZone(d, JST, "MM"));
  const lastDay = new Date(year, month, 0).getDate();
  const iso = formatInTimeZone(d, JST, `yyyy-MM-${String(lastDay).padStart(2, "0")}`);
  return new Date(iso);
}

export function getRangeStart(range: "1m" | "3m" | "6m"): string {
  const d = nowJst();
  const months = range === "1m" ? 1 : range === "3m" ? 3 : 6;
  d.setMonth(d.getMonth() - months);
  return formatInTimeZone(d, JST, "yyyy-MM-dd");
}
