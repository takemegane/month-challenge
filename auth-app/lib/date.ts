export function getJstTodayDate() {
  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return jst.toISOString().slice(0, 10);
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

