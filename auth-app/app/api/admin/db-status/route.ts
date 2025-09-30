import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { query } from "../../../../lib/db";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  try {
    // 既存インデックス確認
    const indexes = await query`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('auth_users', 'auth_entries')
      ORDER BY tablename, indexname;
    `;

    // テーブルサイズ確認
    const tableSizes = await query`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE tablename IN ('auth_users', 'auth_entries');
    `;

    // レコード数確認
    const userCount = await query`SELECT COUNT(*) as count FROM auth_users`;
    const entryCount = await query`SELECT COUNT(*) as count FROM auth_entries`;

    // 最近のエントリ分布
    const recentEntries = await query`
      SELECT
        DATE(entry_date) as date,
        COUNT(*) as count
      FROM auth_entries
      WHERE entry_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(entry_date)
      ORDER BY date DESC
      LIMIT 10;
    `;

    return NextResponse.json({
      indexes: indexes,
      table_sizes: tableSizes,
      record_counts: {
        users: userCount[0]?.count || 0,
        entries: entryCount[0]?.count || 0
      },
      recent_entries: recentEntries,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Database status check failed:', error);
    return NextResponse.json(
      { error: 'Database status check failed', details: error.message },
      { status: 500 }
    );
  }
}