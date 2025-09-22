// Very simple in-memory store for local dev without Supabase
// Map<userId, Set<YYYY-MM-DD>>
const store = new Map<string, Set<string>>();

export function mockAdd(userId: string, date: string): "created" | "exists" {
  let s = store.get(userId);
  if (!s) {
    s = new Set();
    store.set(userId, s);
  }
  if (s.has(date)) return "exists";
  s.add(date);
  return "created";
}

export function mockList(userId: string, since: string, until: string) {
  const s = store.get(userId) || new Set<string>();
  const entries = Array.from(s)
    .filter((d) => d >= since && d <= until)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((entry_date) => ({ entry_date }));
  return entries;
}

