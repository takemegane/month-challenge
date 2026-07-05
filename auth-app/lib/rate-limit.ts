import { query } from "./db";

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// 固定ウィンドウ方式。keyごとの試行回数をNeonでカウントし、
// windowMinutes以内にlimit回を超えたらfalseを返す。
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMinutes: number
): Promise<boolean> {
  const rows = await query<{ count: number }>`
    insert into auth_rate_limits (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when auth_rate_limits.window_start < now() - make_interval(mins => ${windowMinutes})
        then 1
        else auth_rate_limits.count + 1
      end,
      window_start = case
        when auth_rate_limits.window_start < now() - make_interval(mins => ${windowMinutes})
        then now()
        else auth_rate_limits.window_start
      end
    returning count
  `;
  const count = rows[0]?.count ?? 0;
  return count <= limit;
}
