DailyPing — コミュニティ日次投稿トラッカー

概要
- Next.js (App Router, TS) + Tailwind + Neon(Postgres) + PWA。
- 主要ユースケース：ログインなし→ ヘッダーのプルダウンでユーザーを選択 → 「今日の記録」→ 1/3/6ヶ月一覧・CSV、管理者がユーザー名を作成。

開発セットアップ
1) 依存インストール: npm i
2) 環境変数: .env を .env.example から作成
3) DB: Neon(Postgres) に `db/schema.neon.sql` を適用
4) ローカル起動: npm run dev

Vercel への公開準備（デプロイはまだしない）
- 1) リポジトリをVercelにインポート（Framework: Next.js）
- 2) 環境変数をVercelのProject Settingsに設定
  - DATABASE_URL: Neonの接続文字列（sslmode=require 推奨）
  - ADMIN_TOKEN: 管理画面からユーザーを作成する際に必要なトークン
  - NODE_ENV=production（自動でも可）
- 5) PWAアイコンを設置（必須）
  - public/icons/icon-192.png, public/icons/icon-512.png（PNG）
  - ない場合でも動作はしますがPWAインストール時に警告になります
- 6) キャッシュ制御
  - vercel.json で service-worker.js を no-store に設定済み（SW更新の反映を確実に）

メモ（Vercel運用）
- API/SSRはデフォルトでNode.jsランタイム。特別な設定は不要です。
- 環境変数が設定されるとモックモードは自動停止しSupabase/RLSで動作します。
- レート制限（lib/rateLimit.ts）はインメモリ実装のため多インスタンス運用では無効です。Upstash/Redis等に置換を推奨します。
- 既定の背景やアクセントはオレンジ/緑に切り替え可能。好みに応じてtailwind.config.tsのprimaryやlayoutの背景を調整してください。

環境変数
- DATABASE_URL: Neonの接続文字列
- ADMIN_TOKEN: 管理用トークン（/admin からユーザー作成時に `x-admin-token` ヘッダとして使用）

認証・セッション
- ログインなし。ユーザーはヘッダーのプルダウンで選択し、Cookie `user_id`（90日, SameSite=Lax）で紐づけ。

RLS/権限
- DBレベルのRLSは使用していません。必要に応じてPostgresの権限やRow Level Securityを導入してください。

API
- POST /api/entries/today: 今日分を作成（Cookieの `user_id` ベース）。重複時 {status: "exists"}。
- GET /api/entries?range=1m|3m|6m&user_id=me|<uuid>[&format=csv]
- GET /api/users: ユーザー一覧（id, name）
- POST /api/users: ユーザー作成（ヘッダ `x-admin-token: ADMIN_TOKEN` 必須）

UI
- ヘッダー: ユーザー選択プルダウン（Cookieに保存）
- /calendar: カレンダーと「今日の記録」ボタン(連打安全)
- /list: 1/3/6ヶ月ヒートマップ + CSV
- /admin: ユーザーの作成/一覧（ADMIN_TOKEN が必要）

PWA
- public/manifest.json, public/service-worker.js。
- オフライン時の /api/entries/today POST を IndexedDB キューへ保存→復帰時同期。
 - Vercel配信では service-worker.js のキャッシュを no-store に設定済み（vercel.json）。

セキュリティ
- CSRF: middleware.ts で CSRF トークン(cookie)を発行。API は x-csrf-token ヘッダ必須。
- レート制限: 簡易 IP ベース。実運用では外部ストア(Upstash/Redis)推奨。
- トークンローテーション: Supabase JS に依存。必要に応じて再検証を追加。

テスト(方針)
- ユニット: JST 日付ユーティリティ、API 入力検証。
- E2E(Playwright): 未追加。主要ケース(1日1回/過去禁止/RLS/オフライン再送)を追加予定。

注意
- 管理者 API は service role key を使用して RLS をバイパスします。必ずサーバ環境変数として扱ってください。
- 本リポは最小実装です。shadcn/ui 導入やUI強化は任意で追加してください。
引き継ぎ資料
- docs/HANDOVER.md に全体像/統合手順/運用の要点をまとめています。
