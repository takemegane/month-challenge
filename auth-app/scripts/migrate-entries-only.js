#!/usr/bin/env node

/**
 * Redisエントリーのみをneonに移行する専用スクリプト
 * （ユーザー移行は完了済み）
 */

import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL_AUTH;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL_AUTH環境変数が設定されていません');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

console.log('='.repeat(80));
console.log('📅 Redisエントリー移行スクリプト（ユーザー移行済み）');
console.log('='.repeat(80));
console.log(`モード: ${DRY_RUN ? '🧪 ドライラン' : '⚠️  本番実行'}`);
console.log('='.repeat(80));

const redisData = JSON.parse(fs.readFileSync('/tmp/redis-export-backup.json', 'utf8'));
console.log(`\n📥 Redisデータ: ${redisData.users_count}ユーザー, ${redisData.entries_count}エントリー`);

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  try {
    await client.connect();
    console.log('✅ Neon接続成功\n');

    // メールアドレス → Neon IDのマッピング作成
    const { rows: neonUsers } = await client.query('SELECT id, email FROM auth_users');
    const emailToNeonId = {};
    neonUsers.forEach(u => {
      emailToNeonId[u.email] = u.id;
    });

    console.log(`📊 Neonユーザー数: ${neonUsers.length}人`);

    // 現在のNeonエントリーを取得（重複チェック用）
    const { rows: neonEntries } = await client.query('SELECT user_id, entry_date::text as entry_date FROM auth_entries');
    const neonEntrySet = new Set(neonEntries.map(e => `${e.user_id}:${e.entry_date}`));

    console.log(`📊 現在のNeonエントリー数: ${neonEntries.length}件\n`);

    let insertedCount = 0;
    let skippedCount = 0;
    let orphanCount = 0;
    let errorCount = 0;

    console.log('━'.repeat(80));
    console.log('📅 エントリー移行開始');
    console.log('━'.repeat(80));

    for (const entry of redisData.entries) {
      // ユーザーIDマッピング
      const redisUser = redisData.users.find(u => u.id === entry.user_id);

      if (!redisUser) {
        // console.log(`⚠️  孤児エントリー: ID=${entry.id}, user_id=${entry.user_id}`);
        orphanCount++;
        continue;
      }

      const neonUserId = emailToNeonId[redisUser.email];

      if (!neonUserId) {
        // console.log(`⚠️  マッピング失敗: ${redisUser.email}`);
        orphanCount++;
        continue;
      }

      // 重複チェック
      const entryKey = `${neonUserId}:${entry.entry_date}`;
      if (neonEntrySet.has(entryKey)) {
        skippedCount++;
        continue;
      }

      // エントリー挿入
      if (!DRY_RUN) {
        try {
          await client.query(
            `INSERT INTO auth_entries (user_id, entry_date, created_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, entry_date) DO NOTHING`,
            [neonUserId, entry.entry_date, entry.created_at || new Date().toISOString()]
          );
        } catch (error) {
          console.error(`❌ 挿入エラー: user=${redisUser.email}, date=${entry.entry_date}`, error.message);
          errorCount++;
          continue;
        }
      }

      insertedCount++;
      neonEntrySet.add(entryKey);

      if (insertedCount % 100 === 0) {
        console.log(`  進捗: ${insertedCount}件${DRY_RUN ? '挿入予定' : '挿入完了'}...`);
      }
    }

    console.log('\n' + '━'.repeat(80));
    console.log('📊 移行結果');
    console.log('━'.repeat(80));
    console.log(`  ✅ ${DRY_RUN ? '挿入予定' : '挿入完了'}: ${insertedCount}件`);
    console.log(`  ⏭️  スキップ（重複）: ${skippedCount}件`);
    console.log(`  ⚠️  孤児エントリー: ${orphanCount}件`);
    if (errorCount > 0) {
      console.log(`  ❌ エラー: ${errorCount}件`);
    }

    // 最終確認
    const { rows: finalEntries } = await client.query('SELECT COUNT(*) as count FROM auth_entries');
    const { rows: finalUsers } = await client.query('SELECT COUNT(*) as count FROM auth_users');

    console.log('\n最終的なNeonデータ:');
    console.log(`  👥 ユーザー数: ${finalUsers[0].count}人`);
    console.log(`  📅 エントリー数: ${finalEntries[0].count}件 (Redis: ${redisData.entries_count}件)`);

    // 上位ユーザーの確認
    const { rows: topUsers } = await client.query(`
      SELECT u.email, u.name, COUNT(e.id) as entry_count
      FROM auth_users u
      LEFT JOIN auth_entries e ON u.id = e.user_id
      GROUP BY u.id, u.email, u.name
      ORDER BY entry_count DESC
      LIMIT 10
    `);

    console.log('\n📊 エントリー数上位10ユーザー:');
    topUsers.forEach((u, i) => {
      const redisUser = redisData.users.find(ru => ru.email === u.email);
      const redisCount = redisUser
        ? redisData.entries.filter(e => e.user_id === redisUser.id).length
        : 0;
      const match = u.entry_count == redisCount ? '✅' : '⚠️';
      console.log(`  ${i + 1}. ${match} ${u.email} (${u.name}): Neon=${u.entry_count}, Redis=${redisCount}`);
    });

    console.log('\n' + '='.repeat(80));
    if (DRY_RUN) {
      console.log('✅ ドライラン完了');
      console.log('\n本番実行: node scripts/migrate-entries-only.js');
    } else {
      console.log('✅ エントリー移行完了！');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
