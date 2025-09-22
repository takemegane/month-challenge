export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const { neon } = await import("@neondatabase/serverless");
  const url = process.env.DATABASE_URL_AUTH || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_AUTH is not set");
  const sql = neon(url);
  // @ts-ignore
  return sql<T>(strings, ...values);
}

