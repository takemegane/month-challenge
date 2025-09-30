// データベース状況確認用スクリプト
async function checkDbStatus() {
  console.log('=== Database Status Check ===\n');

  try {
    // Neonデータベースクライアントを直接使用
    const { neon } = await import("@neondatabase/serverless");
    const DATABASE_URL = process.env.DATABASE_URL_AUTH || "postgresql://neondb_owner:npg_Gw1lL7nHPNEk@ep-lively-lab-a1zcea4k-pooler.ap-southeast-1.aws.neon.th/neondb?sslmode=require&channel_binding=require";

    const sql = neon(DATABASE_URL, {
      arrayMode: false,
      fullResults: false,
    });

    // 既存インデックス確認
    console.log('🔍 Existing Indexes:');
    const indexes = await sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('auth_users', 'auth_entries')
      ORDER BY tablename, indexname;
    `;
    console.table(indexes);

    // テーブルサイズ確認
    console.log('\n📊 Table Sizes:');
    const tableSizes = await sql`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE tablename IN ('auth_users', 'auth_entries');
    `;
    console.table(tableSizes);

    // レコード数確認
    console.log('\n📈 Record Counts:');
    const userCount = await sql`SELECT COUNT(*) as count FROM auth_users`;
    const entryCount = await sql`SELECT COUNT(*) as count FROM auth_entries`;
    console.log('Users:', userCount[0]?.count || 0);
    console.log('Entries:', entryCount[0]?.count || 0);

    // 最近のエントリ分布
    console.log('\n📅 Recent Entries (Last 30 days):');
    const recentEntries = await sql`
      SELECT
        DATE(entry_date) as date,
        COUNT(*) as count
      FROM auth_entries
      WHERE entry_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(entry_date)
      ORDER BY date DESC
      LIMIT 10;
    `;
    console.table(recentEntries);

    // 管理者ユーザー確認
    console.log('\n👤 Admin Users:');
    const adminUsers = await sql`
      SELECT id, email, name, is_admin, created_at
      FROM auth_users
      WHERE is_admin = true
      ORDER BY created_at;
    `;
    console.table(adminUsers);

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDbStatus();