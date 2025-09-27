export const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function withNoStore(headers: Record<string, string> = {}) {
  return { ...noStoreHeaders, ...headers };
}
