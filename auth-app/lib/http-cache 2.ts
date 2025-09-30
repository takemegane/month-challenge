export type HeaderRecord = Record<string, string>;

export function noStoreHeaders(additional: HeaderRecord = {}): HeaderRecord {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...additional,
  };
}
