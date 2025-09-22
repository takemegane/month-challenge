export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  // @ts-ignore neon tag type compatible
  return sql<T>(strings, ...values);
}
