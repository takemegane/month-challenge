#!/usr/bin/env node

/**
 * RedisデータをNeonに移行するスクリプト
 *
 * 戦略:
 * 1. Redisの新規ユーザー（3人）をNeonに追加
 * 2. 既存ユーザーのパスワードを最新版に更新
 * 3. 全エントリー（512件）をユーザーIDマッピングして移行
 * 4. 重複チェックと整合性検証
 */

import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

// 環境変数から接続情報取得
const DATABASE_URL = process.env.DATABASE_URL_AUTH;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL_AUTH環境変数が設定されていません');
  process.exit(1);
}

// ドライランモードの設定（テスト時はtrue、本番実行時はfalse）
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_ENTRIES = process.argv.includes('--users-only');

console.log('='.repeat(80));
console.log('🚀 Redis → Neon データ移行スクリプト');
console.log('='.repeat(80));
console.log(`モード: ${DRY_RUN ? '🧪 ドライラン（実際の変更なし）' : '⚠️  本番実行（データベースを変更）'}`);
console.log(`エントリー移行: ${SKIP_ENTRIES ? '❌ スキップ' : '✅ 実行'}`);
console.log('='.repeat(80));

// データ読み込み
const redisData = JSON.parse(fs.readFileSync('/tmp/redis-export-backup.json', 'utf8'));
console.log(`\n📥 Redisデータ読み込み: ${redisData.users_count}ユーザー, ${redisData.entries_count}エントリー`);

// データベース接続
const client = new Client({
  connectionString: DATABASE_URL,
});

// メールアドレスベースのユーザーIDマッピング
const emailToNeonId = {};

async function main() {
  try {
    await client.connect();
    console.log('✅ Neonデータベースに接続しました\n');

    // 現在のNeonユーザーを取得
    const { rows: neonUsers } = await client.query('SELECT id, email, password_hash FROM auth_users');
    console.log(`📊 現在のNeonユーザー数: ${neonUsers.length}人\n`);

    // メールアドレス → Neon ID のマッピング作成
    neonUsers.forEach(u => {
      emailToNeonId[u.email] = u.id;
    });

    // ステップ1: ユーザー移行
    await migrateUsers(neonUsers);

    // ステップ2: エントリー移行
    if (!SKIP_ENTRIES) {
      await migrateEntries();
    }

    // ステップ3: 検証
    await verifyMigration();

    console.log('\n' + '='.repeat(80));
    if (DRY_RUN) {
      console.log('✅ ドライラン完了（データベースは変更されていません）');
      console.log('\n本番実行するには、次のコマンドを実行してください:');
      console.log('  node scripts/migrate-redis-to-neon.js');
    } else {
      console.log('✅ 移行完了！');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    if (!DRY_RUN) {
      console.log('\n⚠️  エラー発生。バックアップからの復旧が可能です:');
      console.log('  /tmp/neon-users-backup.csv');
      console.log('  /tmp/neon-entries-backup.csv');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function migrateUsers(neonUsers) {
  console.log('━'.repeat(80));
  console.log('👥 ステップ1: ユーザー移行');
  console.log('━'.repeat(80));

  const neonEmails = new Set(neonUsers.map(u => u.email));
  const redisOnlyUsers = redisData.users.filter(u => !neonEmails.has(u.email));
  const commonUsers = redisData.users.filter(u => neonEmails.has(u.email));

  // 1.1: 新規ユーザーの追加
  console.log(`\n📝 新規ユーザーの追加: ${redisOnlyUsers.length}人`);

  for (const user of redisOnlyUsers) {
    console.log(`  - ${user.email} (${user.name})`);

    if (!DRY_RUN) {
      const result = await client.query(
        `INSERT INTO auth_users (email, password_hash, name, is_admin, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [user.email, user.password_hash, user.name, user.is_admin]
      );
      emailToNeonId[user.email] = result.rows[0].id;
      console.log(`    ✅ 追加完了 (新ID: ${result.rows[0].id})`);
    } else {
      console.log(`    🧪 [DRY RUN] 追加予定`);
    }
  }

  // 1.2: 既存ユーザーのパスワード更新チェック
  console.log(`\n🔄 既存ユーザーのパスワード確認: ${commonUsers.length}人`);

  let updatedCount = 0;
  for (const redisUser of commonUsers) {
    const neonUser = neonUsers.find(u => u.email === redisUser.email);

    if (redisUser.password_hash !== neonUser.password_hash) {
      console.log(`  - ${redisUser.email}: パスワードハッシュが異なります`);

      if (!DRY_RUN) {
        await client.query(
          'UPDATE auth_users SET password_hash = $1 WHERE email = $2',
          [redisUser.password_hash, redisUser.email]
        );
        console.log(`    ✅ パスワードを更新しました`);
        updatedCount++;
      } else {
        console.log(`    🧪 [DRY RUN] 更新予定`);
        updatedCount++;
      }
    }
  }

  if (updatedCount === 0) {
    console.log('  すべてのユーザーのパスワードは一致しています ✅');
  } else {
    console.log(`\n  合計 ${updatedCount}人のパスワードを${DRY_RUN ? '更新予定' : '更新しました'}`);
  }
}

async function migrateEntries() {
  console.log('\n' + '━'.repeat(80));
  console.log('📅 ステップ2: エントリー移行');
  console.log('━'.repeat(80));

  // 最新のNeonユーザーを再取得（新規追加されたユーザーを含む）
  if (!DRY_RUN) {
    const { rows: updatedNeonUsers } = await client.query('SELECT id, email FROM auth_users');
    // マッピング更新
    updatedNeonUsers.forEach(u => {
      emailToNeonId[u.email] = u.id;
    });
  }

  // 現在のNeonエントリーを取得
  const { rows: neonEntries } = await client.query('SELECT user_id, entry_date::text FROM auth_entries');
  const neonEntrySet = new Set(neonEntries.map(e => `${e.user_id}:${e.entry_date}`));

  console.log(`\n📊 現在のNeonエントリー数: ${neonEntries.length}件`);
  console.log(`📊 移行するRedisエントリー数: ${redisData.entries.length}件\n`);

  let insertedCount = 0;
  let skippedCount = 0;
  let orphanCount = 0;

  for (const entry of redisData.entries) {
    // ユーザーIDをメールアドレス経由でNeon IDにマッピング
    const redisUser = redisData.users.find(u => u.id === entry.user_id);

    if (!redisUser) {
      console.log(`⚠️  孤児エントリー検出: エントリーID=${entry.id}, ユーザーID=${entry.user_id}`);
      orphanCount++;
      continue;
    }

    const neonUserId = emailToNeonId[redisUser.email];

    if (!neonUserId) {
      console.log(`⚠️  ユーザーIDマッピング失敗: ${redisUser.email}`);
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
      await client.query(
        `INSERT INTO auth_entries (user_id, entry_date, created_at)
         VALUES ($1, $2, $3)`,
        [neonUserId, entry.entry_date, entry.created_at || new Date().toISOString()]
      );
    }

    insertedCount++;
    neonEntrySet.add(entryKey); // 次回の重複チェック用

    // 進捗表示（100件ごと）
    if (insertedCount % 100 === 0) {
      console.log(`  進捗: ${insertedCount}件${DRY_RUN ? '挿入予定' : '挿入完了'}...`);
    }
  }

  console.log(`\n📊 エントリー移行結果:`);
  console.log(`  ✅ ${DRY_RUN ? '挿入予定' : '挿入完了'}: ${insertedCount}件`);
  console.log(`  ⏭️  スキップ（重複）: ${skippedCount}件`);
  console.log(`  ⚠️  孤児エントリー: ${orphanCount}件`);
}

async function verifyMigration() {
  console.log('\n' + '━'.repeat(80));
  console.log('🔍 ステップ3: データ検証');
  console.log('━'.repeat(80));

  const { rows: users } = await client.query('SELECT COUNT(*) as count FROM auth_users');
  const { rows: entries } = await client.query('SELECT COUNT(*) as count FROM auth_entries');

  console.log(`\n最終的なNeonデータ:`);
  console.log(`  👥 ユーザー数: ${users[0].count}人 (Redis: ${redisData.users_count}人)`);
  console.log(`  📅 エントリー数: ${entries[0].count}件 (Redis: ${redisData.entries_count}件)`);

  // ユーザー別エントリー数の比較
  const { rows: userEntryCounts } = await client.query(`
    SELECT u.email, u.name, COUNT(e.id) as entry_count
    FROM auth_users u
    LEFT JOIN auth_entries e ON u.id = e.user_id
    GROUP BY u.id, u.email, u.name
    ORDER BY entry_count DESC
    LIMIT 5
  `);

  console.log(`\n上位5ユーザーのエントリー数:`);
  userEntryCounts.forEach(u => {
    const redisUser = redisData.users.find(ru => ru.email === u.email);
    const redisEntryCount = redisUser
      ? redisData.entries.filter(e => e.user_id === redisUser.id).length
      : 0;
    console.log(`  - ${u.email} (${u.name}): Neon=${u.entry_count}, Redis=${redisEntryCount}`);
  });
}

// 実行
main();
