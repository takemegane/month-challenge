# 月チャレ（メールログイン版）

## セットアップ
- `auth-app/db/schema.neon.sql` を接続先DBに適用
- 環境変数（Vercel Project Settings）
  - `DATABASE_URL_AUTH`: Neon/Postgres 接続文字列
  - `AUTH_SESSION_SECRET`: 長いランダム文字列
  - `ADMIN_EMAILS`: 初期管理者メール（例: `x1takemegane@gmail.com`）

## API 概要
- POST `/api/auth/register` { email, password, name }
- POST `/api/auth/login` { email, password }
- POST `/api/auth/logout`
- GET  `/api/auth/me`
- POST `/api/entries/today`（今日の記録）
- GET  `/api/entries`（当月 or since/until 指定）

## デプロイ
- 別Vercelプロジェクトとして Root Directory=`auth-app` を設定
- GitHub Actions の Secrets に以下を追加
  - `VERCEL_PROJECT_ID_AUTH`: 認証版プロジェクトのID
  - 既存の `VERCEL_TOKEN`, `VERCEL_ORG_ID` は共通利用
- main への push で本番デプロイ、PRでプレビューURLを自動コメント

