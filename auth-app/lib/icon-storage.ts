// PWAアイコンの永続化ストレージ。Neonの auth_pwa_icons テーブルが正本。
// メモリキャッシュは同一インスタンス内の再取得を速くするだけで、
// 未ヒット(null)はキャッシュしない(他インスタンスの更新を見逃さないため)。
import { query } from "./db";

const cache = new Map<string, string>();

export async function setIcon(size: string, base64Data: string): Promise<void> {
  await query`
    insert into auth_pwa_icons (size, data, updated_at)
    values (${size}, ${base64Data}, now())
    on conflict (size) do update set data = excluded.data, updated_at = now()
  `;
  cache.set(size, base64Data);
}

export async function getIcon(size: string): Promise<string | null> {
  if (cache.has(size)) return cache.get(size)!;
  const rows = await query<{ data: string }>`
    select data from auth_pwa_icons where size = ${size}
  `;
  const data = rows[0]?.data ?? null;
  if (data) cache.set(size, data);
  return data;
}

export async function hasIcons(): Promise<boolean> {
  if (cache.size > 0) return true;
  const rows = await query<{ size: string }>`select size from auth_pwa_icons limit 1`;
  return rows.length > 0;
}

export async function clearIcons(): Promise<void> {
  await query`delete from auth_pwa_icons`;
  cache.clear();
}
