export function isMockMode() {
  // In Neon移行後: DATABASE_URL があれば本番モード
  return !process.env.DATABASE_URL;
}
