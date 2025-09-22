// Simple in-memory IP+User rate limiter (for demo; replace in production)
type Key = string;
type Entry = { tokens: number; updatedAt: number };
const store = new Map<Key, Entry>();

export function rateLimit(key: string, limit: number, refillPerSec = limit): boolean {
  // token bucket
  const now = Date.now();
  const e = store.get(key);
  if (!e) {
    store.set(key, { tokens: limit - 1, updatedAt: now });
    return true;
  }
  const elapsed = (now - e.updatedAt) / 1000;
  const refill = Math.floor(elapsed * refillPerSec);
  e.tokens = Math.min(limit, e.tokens + refill);
  e.updatedAt = now;
  if (e.tokens <= 0) return false;
  e.tokens -= 1;
  return true;
}

