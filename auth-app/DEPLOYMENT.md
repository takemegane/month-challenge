# 🚀 本番デプロイ後の設定手順

このドキュメントは、キャッシュシステムを本番環境で有効にするための手順書です。

## 📋 事前確認

- [x] Gitプッシュ完了
- [ ] Vercelデプロイ完了
- [ ] Vercel環境変数設定完了
- [ ] Vercel Cron有効化完了
- [ ] 初回キャッシュ構築完了

---

## ステップ1: Vercelデプロイ状態の確認

1. Vercel Dashboardにアクセス
   ```
   https://vercel.com/takemeganes-projects/month-challenge-auth
   ```

2. 最新のデプロイが成功していることを確認
   - Status: **Ready**
   - Domain: `https://your-app.vercel.app`

---

## ステップ2: 環境変数の設定

Vercel Dashboard → Settings → Environment Variables

### 必須の環境変数

| 変数名 | 値 | 環境 |
|-------|-----|-----|
| `ADMIN_CRON_TOKEN` | `Summer2025Strong` | Production |
| `DATABASE_URL_AUTH` | （Neon接続文字列） | Production |
| `AUTH_SESSION_SECRET` | （セッション秘密鍵） | Production |
| `ADMIN_EMAILS` | `x1takemegane@gmail.com` | Production |

### 設定方法

```bash
# Vercel CLIを使用する場合
vercel env add ADMIN_CRON_TOKEN
# 値: Summer2025Strong
# 環境: Production

vercel env add DATABASE_URL_AUTH
# 値: postgresql://neondb_owner:npg_Gw1lL7nHPNEk@ep-lively-lab-a1zcea4k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
# 環境: Production
```

または、Vercel Dashboard上で直接設定：
1. Settings → Environment Variables
2. "Add New" ボタンをクリック
3. 各変数を入力して保存

**重要**: 環境変数を追加/変更した後は**再デプロイが必要**です。

---

## ステップ3: Vercel Cronの有効化確認

1. Vercel Dashboard → Settings → Cron Jobs

2. 以下の2つのCron Jobが表示されていることを確認：

   **Cron Job 1: sync**
   - Path: `/api/cron/sync`
   - Schedule: `0 2 * * *` (毎日午前2時)
   - Status: **Enabled** ✅

   **Cron Job 2: cache-worker** 🆕
   - Path: `/api/admin/cache-worker?token=Summer2025Strong`
   - Schedule: `* * * * *` (毎分)
   - Status: **Enabled** ✅

3. もし「Disabled」になっている場合は、"Enable"をクリック

---

## ステップ4: 初回キャッシュ構築

デプロイ後、**必ず**初回キャッシュを構築してください。

### 方法1: curlコマンドで実行

```bash
# 全月のキャッシュを自動構築（当月+前月）
curl -X POST "https://your-app.vercel.app/api/admin/cache-rebuild?token=Summer2025Strong"

# レスポンス例
# {"month":"auto","status":"succeeded","processedUsers":50}
```

### 方法2: 特定月を指定して構築

```bash
# 2025年9月
curl -X POST "https://your-app.vercel.app/api/admin/cache-rebuild?token=Summer2025Strong&month=2025-09"

# 2025年10月
curl -X POST "https://your-app.vercel.app/api/admin/cache-rebuild?token=Summer2025Strong&month=2025-10"

# 2025年11月
curl -X POST "https://your-app.vercel.app/api/admin/cache-rebuild?token=Summer2025Strong&month=2025-11"
```

### 構築状態の確認

```bash
# データベースに直接接続して確認
export PGPASSWORD="npg_Gw1lL7nHPNEk"
psql -h ep-lively-lab-a1zcea4k-pooler.ap-southeast-1.aws.neon.tech \
     -U neondb_owner -d neondb \
     -c "SELECT month, COUNT(*) as users, SUM(total) as total_checks FROM auth_daily_stats_cache GROUP BY month ORDER BY month;"

# 期待される結果:
#   month  | users | total_checks
# ---------+-------+--------------
#  2025-09 |     3 |           35
#  2025-10 |     2 |           26
#  2025-11 |     1 |            1
```

---

## ステップ5: 動作確認

### 5-1. Cache Workerの手動実行テスト

```bash
curl "https://your-app.vercel.app/api/admin/cache-worker?token=Summer2025Strong"

# 期待される結果（ジョブがない場合）:
# {"status":"idle","released":0,"pending":0,"failed":0}
```

### 5-2. エンドツーエンドテスト

1. **ブラウザでアプリにアクセス**
   ```
   https://your-app.vercel.app
   ```

2. **ログイン**
   - メールアドレスとパスワードでログイン

3. **チェックボタンを押す**
   - 今日の日付のチェックボタンをクリック
   - 「✓」が表示されることを確認

4. **1分待つ**
   - Vercel Cronが自動実行されるのを待つ

5. **ダッシュボードで確認**
   - ページをリロード
   - チェック数が増えていることを確認
   - 表示速度が高速（<50ms）であることを確認

### 5-3. Vercel Cronログの確認

Vercel Dashboard → Deployments → Latest Deployment → Logs

以下のようなログが1分ごとに出力されていることを確認：
```
GET /api/admin/cache-worker?token=Summer2025Strong 200
{"status":"ok","processed":1,"failed":0,...}
```

---

## ステップ6: モニタリング設定（推奨）

### Diff Jobsの状態を定期確認

```bash
# Pendingジョブ数の確認
curl "https://your-app.vercel.app/api/admin/cache-worker?token=Summer2025Strong" | jq '.pending'

# Failedジョブ数の確認
curl "https://your-app.vercel.app/api/admin/cache-worker?token=Summer2025Strong" | jq '.failed'
```

**推奨アクション:**
- `pending` が100以上: 処理が追いついていない可能性
- `failed` が10以上: エラー調査が必要

---

## 🔧 トラブルシューティング

### Q1. キャッシュが更新されない

**確認事項:**
1. Vercel Cronが有効になっているか確認
2. `ADMIN_CRON_TOKEN`が正しく設定されているか確認
3. Vercel Logsでエラーが出ていないか確認

**対処法:**
```bash
# 手動でWorkerを実行してエラーを確認
curl "https://your-app.vercel.app/api/admin/cache-worker?token=Summer2025Strong"
```

### Q2. Cronが実行されない

**確認事項:**
1. Vercel Dashboard → Settings → Cron Jobs
2. cache-workerが**Enabled**になっているか確認
3. Free Planの場合、Cron制限があるか確認

**対処法:**
- Vercel DashboardでCronを一度DisableしてからEnable
- デプロイを再実行

### Q3. 環境変数が反映されない

**対処法:**
```bash
# Vercel CLI で確認
vercel env ls

# 環境変数を追加後、必ず再デプロイ
vercel --prod
```

---

## ✅ 完了チェックリスト

デプロイ後、以下をすべて確認してください：

- [ ] Vercelデプロイが成功している
- [ ] 環境変数が全て設定されている
- [ ] Vercel Cronが2つとも有効になっている
- [ ] 初回キャッシュ構築が成功している
- [ ] Cache Workerが正常に動作している
- [ ] ユーザーがチェックを押すとキャッシュが更新される
- [ ] ダッシュボードの表示が高速（<50ms）

---

## 📊 本番運用後のメンテナンス

### 月次作業

**毎月1日に実行推奨:**
```bash
# 新しい月のキャッシュを初期構築
curl -X POST "https://your-app.vercel.app/api/admin/cache-rebuild?token=Summer2025Strong&month=YYYY-MM"
```

### 不要データの削除（任意）

**3ヶ月以上前のキャッシュを削除:**
```sql
-- データベースに直接接続
DELETE FROM auth_daily_stats_cache WHERE month < '2025-09';
DELETE FROM auth_daily_totals_cache WHERE month < '2025-09';
DELETE FROM auth_daily_stats_tasks WHERE month < '2025-09';
```

---

## 📞 サポート

問題が解決しない場合は、以下の情報を添えて報告してください：

1. Vercel Deployment URL
2. エラーメッセージ（Vercel Logsから）
3. 実行したコマンドとレスポンス
4. ブラウザのコンソールエラー（該当する場合）

---

**最終更新**: 2025-11-01
**作成者**: Claude Code + 元気さん
