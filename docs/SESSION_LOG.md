DailyPing 月チャレ — 作業ログ（セッション保存）

日時: 2025-09-21

要約
- 認証無し運用に切替。ユーザーはヘッダーのプルダウンで選択（Cookie `user_id`）。
- DBを Supabase から Neon(Postgres) へ移行（`@neondatabase/serverless`）。
- API/画面をNeon用に再実装。ビルド/デプロイ検証済み。
- 管理画面を非公開化（リンク非表示、Cookie認証、入室/退出ルート追加）。
- 管理機能: ユーザー追加（単体/CSV一括）、チェック修正（付与/削除）、ユーザー削除を実装。
- UI調整: ヘッダー/カレンダーのサイズ、ナビ文言、月別件数の表記、ユーザー切替時の自動リロードなど。

主要変更点
1) DB/環境
- 追加: `lib/db.ts`（Neon接続ヘルパ）
- 環境変数: `.env(.example)` を `DATABASE_URL`, `ADMIN_TOKEN` に更新
- スキーマ: `db/schema.neon.sql`（users, entries, トリガ）

2) 認証/モード
- 認証廃止。Cookie `user_id` を利用
- モック判定: `DATABASE_URL` 未設定時のみ（`lib/runtime.ts`）

3) API
- GET `/api/users` — ユーザー一覧
- POST `/api/users` — ユーザー追加（admin cookie 必須）
- POST `/api/users/import` — ユーザー一括登録（JSON/貼付 or multipart/ファイル）
- DELETE `/api/users/[id]` — ユーザー削除（admin cookie 必須）
- GET `/api/entries` — 期間/CSV対応。`user_id` は Cookie or 明示指定
- POST `/api/entries/today` — 当日登録（重複は `exists`）
- POST/DELETE `/api/admin/entries` — 管理によるチェック付与/削除

4) 管理画面と保護
- 入室: `/admin/enter`（パスワード=ADMIN_TOKEN、30日記憶可）、POST `/admin/access`
- 退出: `/admin/logout`
- 保護: `middleware.ts` で `admin_access=1` がなければ `/admin` は 404
- Cookie secure属性: `NODE_ENV==='production'` のときのみ有効（ローカルは非secure）

5) 画面/UI
- ヘッダー: 「今月のカレンダー」「一覧」「ユーザー」拡大、左上ロゴ拡大
- カレンダー: 件数ヘッダー「今月の件数 / n月の件数」、曜日・セルサイズ拡大
- ユーザー選択: 変更時に自動リロード
- 一覧: モック投入ボタンはモックモード時のみ表示
- 管理: ユーザー登録（単体/CSV一括・テンプレDL・プレビュー・新規/既存表示）、チェック修正（付与/削除）、ユーザー削除

6) デプロイ
- Vercelで `DATABASE_URL`, `ADMIN_TOKEN` を設定
- `npm run build` は `NODE_ENV=production next build`（package.json）
- 本番反映: `vercel --prod`

検証メモ
- ビルド: 成功（Next.js 15.6.0-canary.20）。
- ローカルで管理Cookieが付かない問題: Cookie secure=false として解消。
- 削除: `/api/users/[id]` で 200 deleted / 404 not_found を確認。UIから削除→一覧更新。

運用上の注意
- 削除は不可逆。もし論理削除へ変更したい場合は users に `archived boolean` を追加し、UI/一覧/選択から除外する運用が無難。
- レート制限/監査を強化する場合、操作ログテーブルの追加を推奨。

今後のTODO（任意）
- CSVの拡張（name,email 等の複数列、エラー行ハイライト）
- 管理画面のドラッグ&ドロップ対応
- /admin への別導線（管理者用ブックマーク、サブドメイン運用）
- `npm audit fix` の実行（中程度の脆弱性が残存）

