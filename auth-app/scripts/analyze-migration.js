#!/usr/bin/env node

/**
 * RedisデータとNeonデータの差分分析スクリプト
 *
 * 目的: 安全な移行のため、両データソースを比較して差分を明確にする
 */

import fs from 'fs';

// ファイル読み込み
const redisData = JSON.parse(fs.readFileSync('/tmp/redis-export-backup.json', 'utf8'));
const neonUsersCSV = fs.readFileSync('/tmp/neon-users-backup.csv', 'utf8');
const neonEntriesCSV = fs.readFileSync('/tmp/neon-entries-backup.csv', 'utf8');

// CSV解析
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => v.replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i];
    });
    return obj;
  });
}

const neonUsers = parseCSV(neonUsersCSV);
const neonEntries = parseCSV(neonEntriesCSV);

console.log('='.repeat(80));
console.log('📊 Redis vs Neon データ比較分析');
console.log('='.repeat(80));

console.log('\n【基本統計】');
console.log(`Redis: ${redisData.users_count} ユーザー, ${redisData.entries_count} エントリー`);
console.log(`Neon:  ${neonUsers.length} ユーザー, ${neonEntries.length} エントリー`);
console.log(`差分:  ${redisData.users_count - neonUsers.length} ユーザー, ${redisData.entries_count - neonEntries.length} エントリー`);

// ユーザー差分分析
console.log('\n【ユーザー差分分析】');

// Redisのメールアドレス一覧
const redisEmails = new Set(redisData.users.map(u => u.email));
const neonEmails = new Set(neonUsers.map(u => u.email));

// Redisにのみ存在するユーザー
const redisOnlyUsers = redisData.users.filter(u => !neonEmails.has(u.email));
console.log(`\n✅ Redisにのみ存在するユーザー: ${redisOnlyUsers.length}人`);
if (redisOnlyUsers.length > 0) {
  console.log('サンプル (最大5人):');
  redisOnlyUsers.slice(0, 5).forEach(u => {
    console.log(`  - ${u.email} (${u.name}) [ID: ${u.id}]`);
  });
}

// Neonにのみ存在するユーザー
const neonOnlyUsers = neonUsers.filter(u => !redisEmails.has(u.email));
console.log(`\n⚠️  Neonにのみ存在するユーザー: ${neonOnlyUsers.length}人`);
if (neonOnlyUsers.length > 0) {
  console.log('サンプル (最大5人):');
  neonOnlyUsers.slice(0, 5).forEach(u => {
    console.log(`  - ${u.email} (${u.name}) [ID: ${u.id}]`);
  });
}

// 両方に存在するユーザー
const commonUsers = redisData.users.filter(u => neonEmails.has(u.email));
console.log(`\n🔄 両方に存在するユーザー: ${commonUsers.length}人`);

// エントリー差分分析
console.log('\n【エントリー差分分析】');

// RedisユーザーIDとNeonユーザーIDのマッピング作成
const emailToNeonId = {};
neonUsers.forEach(u => {
  emailToNeonId[u.email] = u.id;
});

const emailToRedisId = {};
redisData.users.forEach(u => {
  emailToRedisId[u.email] = u.id;
});

// Redisエントリーをメールベースで分析
const redisEntriesByEmail = {};
redisData.entries.forEach(entry => {
  const user = redisData.users.find(u => u.id === entry.user_id);
  if (user) {
    if (!redisEntriesByEmail[user.email]) {
      redisEntriesByEmail[user.email] = [];
    }
    redisEntriesByEmail[user.email].push(entry);
  }
});

// Neonエントリーをメールベースで分析
const neonEntriesByEmail = {};
neonEntries.forEach(entry => {
  const user = neonUsers.find(u => u.id === entry.user_id);
  if (user) {
    if (!neonEntriesByEmail[user.email]) {
      neonEntriesByEmail[user.email] = [];
    }
    neonEntriesByEmail[user.email].push(entry);
  }
});

console.log(`\nRedisエントリー総数: ${redisData.entries_count}`);
console.log(`Neonエントリー総数: ${neonEntries.length}`);
console.log(`差分: ${redisData.entries_count - neonEntries.length} エントリー`);

// ユーザー別エントリー数比較
console.log('\n【ユーザー別エントリー数比較】(上位10人)');
const emailEntryComparison = {};
[...redisEmails, ...neonEmails].forEach(email => {
  const redisCount = (redisEntriesByEmail[email] || []).length;
  const neonCount = (neonEntriesByEmail[email] || []).length;
  if (redisCount > 0 || neonCount > 0) {
    emailEntryComparison[email] = {
      redis: redisCount,
      neon: neonCount,
      diff: redisCount - neonCount
    };
  }
});

const sortedComparison = Object.entries(emailEntryComparison)
  .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))
  .slice(0, 10);

sortedComparison.forEach(([email, counts]) => {
  const user = redisData.users.find(u => u.email === email) || neonUsers.find(u => u.email === email);
  const name = user ? user.name : '不明';
  const status = counts.diff > 0 ? '🔴' : counts.diff < 0 ? '🟡' : '✅';
  console.log(`${status} ${email} (${name}): Redis=${counts.redis}, Neon=${counts.neon}, 差分=${counts.diff > 0 ? '+' : ''}${counts.diff}`);
});

// ID形式の分析
console.log('\n【ID形式の分析】');
const redisNumericIds = redisData.users.filter(u => /^\d+$/.test(u.id));
const redisUuidIds = redisData.users.filter(u => /^[0-9a-f-]{36}$/.test(u.id));
console.log(`Redis: ${redisNumericIds.length}人が数値ID, ${redisUuidIds.length}人がUUID`);
console.log(`Neon:  すべてUUID形式`);

// 移行戦略の提案
console.log('\n' + '='.repeat(80));
console.log('📋 推奨移行戦略');
console.log('='.repeat(80));

console.log('\n1. ユーザー移行:');
if (redisOnlyUsers.length > 0) {
  console.log(`   ✅ Redisの${redisOnlyUsers.length}人の新規ユーザーをNeonに追加`);
}
if (commonUsers.length > 0) {
  console.log(`   ⚠️  両方に存在する${commonUsers.length}人: パスワードハッシュを比較して最新版を保持`);
}
if (neonOnlyUsers.length > 0) {
  console.log(`   ⚠️  Neonのみの${neonOnlyUsers.length}人: 削除せず保持（データ保全）`);
}

console.log('\n2. エントリー移行:');
console.log(`   ✅ Redisの全${redisData.entries_count}エントリーを移行`);
console.log('   ✅ 重複チェック: (user_id, entry_date) で重複を避ける');
console.log('   ✅ ユーザーIDマッピング: Redis ID → Neon UUID');

console.log('\n3. データ整合性チェック:');
console.log('   ✅ 孤児エントリーの検出（存在しないユーザーIDを参照）');
console.log('   ✅ 日付形式の検証（YYYY-MM-DD形式）');
console.log('   ✅ タイムスタンプの検証');

console.log('\n' + '='.repeat(80));
console.log('バックアップファイル:');
console.log('  Redis: /tmp/redis-export-backup.json');
console.log('  Neon Users: /tmp/neon-users-backup.csv');
console.log('  Neon Entries: /tmp/neon-entries-backup.csv');
console.log('='.repeat(80));
