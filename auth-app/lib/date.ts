export function getJstTodayDate() {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonthJst(base: string) {
  const d = new Date(base);
  const j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  return j;
}
export function endOfMonthJst(base: string) {
  const d = new Date(base);
  const j = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0));
  return j;
}
export function toISODate(d: Date | string) {
  if (typeof d === 'string') return d;
  return d.toISOString().slice(0,10);
}

