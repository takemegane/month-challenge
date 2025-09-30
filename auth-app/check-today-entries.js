// 今日の全エントリーを確認するスクリプト
async function checkTodayEntries() {
  console.log('=== Today\'s Entries Check ===\n');

  try {
    const { neon } = await import("@neondatabase/serverless");
    const DATABASE_URL = process.env.DATABASE_URL_AUTH || "postgresql://neondb_owner:npg_Gw1lL7nHPNEk@ep-lively-lab-a1zcea4k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

    const sql = neon(DATABASE_URL, {
      arrayMode: false,
      fullResults: false,
    });

    // 今日の日付（JST）
    const today = new Date();
    const jst = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const todayJST = jst.toISOString().slice(0, 10);
    console.log('今日の日付 (JST):', todayJST);

    // 今日のエントリー確認
    console.log('\n📅 Today\'s Entries:');
    const todayEntries = await sql`
      SELECT
        e.id,
        e.user_id,
        e.entry_date,
        e.created_at,
        u.email,
        u.name
      FROM auth_entries e
      JOIN auth_users u ON e.user_id = u.id
      WHERE e.entry_date = ${todayJST}
      ORDER BY e.created_at;
    `;

    if (todayEntries.length === 0) {
      console.log('❌ 今日のエントリーはありません');
    } else {
      console.table(todayEntries);
    }

    // 最近3日間のエントリー
    console.log('\n📊 Last 3 Days Entries:');
    const recentEntries = await sql`
      SELECT
        e.entry_date,
        u.email,
        u.name,
        e.created_at
      FROM auth_entries e
      JOIN auth_users u ON e.user_id = u.id
      WHERE e.entry_date >= ${todayJST}::date - INTERVAL '2 days'
      ORDER BY e.entry_date DESC, e.created_at DESC;
    `;
    console.table(recentEntries);

    // ユーザー別最後のエントリー
    console.log('\n👤 Each User\'s Last Entry:');
    const lastEntries = await sql`
      SELECT DISTINCT ON (u.id)
        u.email,
        u.name,
        e.entry_date,
        e.created_at
      FROM auth_users u
      LEFT JOIN auth_entries e ON u.id = e.user_id
      ORDER BY u.id, e.created_at DESC;
    `;
    console.table(lastEntries);

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkTodayEntries();