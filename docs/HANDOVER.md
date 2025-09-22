DailyPing (月チャレ) — 引き継ぎ資料

重要な変更（Neon対応・ログイン廃止）
- 認証は廃止: ログイン無しで利用します。ヘッダーのプルダウンからユーザー名を選択して利用します。
- DBはSupabaseではなくNeon(Postgres)を利用: 環境変数 `DATABASE_URL` を設定してください。
- 管理者はユーザー名の作成のみを行います: `/admin` 画面から `ADMIN_TOKEN` を指定してユーザーを作成します。
- スキーマ: `db/schema.neon.sql` をNeonに適用してください。

目的
- メールマジックリンクでサインインしたメンバーが、JST基準で「今日の記録」を1日1回押すシンプルな日次トラッカー。
- 直近6ヶ月の月別合計と、各月のカレンダー表示。
- 管理者はユーザー一覧やエントリの管理が可能（本番時）。

技術スタック
- Next.js App Router + TypeScript
- Tailwind CSS
- Neon (Postgres) + @neondatabase/serverless
- PWA（manifest, service worker。既存SWがある場合は統合作業が必要）

主要ディレクトリ・ファイル
- Pages/UI
  - `app/(auth)/sign-in/`: サインイン（Magic Link）
  - `app/(dashboard)/calendar/`: カレンダー（`?month=YYYY-MM`で特定の月表示）
  - `app/(dashboard)/list/`: 6ヶ月の月別合計。各月クリックでカレンダーへ
  - `app/admin/`: 管理者画面（本番時はSupabaseのusers、モック時はダミー表示）
- API
  - `app/api/entries/today/route.ts`: 今日分の登録（CSRF必須、重複はexists）
  - `app/api/entries/route.ts`: 範囲/月指定の一覧取得（`format=csv`対応）
  - `app/api/admin/entries/route.ts`: 管理者向けPOST/PATCH/DELETE（監査項目必須）
  - `app/api/mock/seed/route.ts`: モック用の投入API（ローカル確認）
- Components/Libraries
  - `components/CalendarView.tsx`, `components/CalendarGrid.tsx`
  - `components/MockSeedButton.tsx`
  - `lib/date.ts`（JSTユーティリティ）, `lib/db.ts`（Neon接続ヘルパー）
  - `lib/runtime.ts`（モックモード判定）, `lib/mockStore.ts`（インメモリストア）
- PWA
  - `public/manifest.json`, `public/service-worker.js`
  - `vercel.json`（SWのno-storeヘッダ）
- DB
  - `db/schema.sql`, `db/policies.sql`, `db/triggers.sql`

ルーティング
- GET `/calendar?month=YYYY-MM` — カレンダー表示（未指定は今月）
- GET `/list` — 直近6ヶ月の月別合計（クリックでカレンダーへ）
- GET `/admin` — 管理画面（本番はSupabase users、モックはダミー）
- POST `/api/entries/today` — 今日分の登録（レスポンス `{status: 'created'|'exists'}`）
- GET `/api/entries?range=1m|3m|6m&user_id=me|<uuid>[&format=csv]`
- GET `/api/entries?since=YYYY-MM-DD&until=YYYY-MM-DD` — 任意範囲
- POST/PATCH/DELETE `/api/admin/entries` — 管理者のみ（`edited_by_admin`,`edit_reason`必須）

データモデル（Neon）
- `public.users`
  - `id uuid primary key default gen_random_uuid()`, `name text unique not null`
- `public.entries`
  - `id bigserial` (PK), `user_id uuid` (FK users), `entry_date date not null`, `created_at/updated_at timestamptz`, 一意制約: `unique(user_id, entry_date)`

RLS（Row Level Security）
- `entries`
  - select: 自分のデータ or 管理者
  - insert: `user_id = auth.uid()` かつ `entry_date = JST今日`
  - admin: 全操作可（using/with checkでis_admin）
- `users`/`trusted_sessions` も利用者/管理者権限でポリシー設定済み

認証/セッション
- ログイン無し。ユーザーはヘッダーのプルダウンで自分の名前（usersテーブルの1行）を選ぶ。
- 選択はCookie `user_id`（90日, SameSite=Lax）に保存し、APIはそれを参照して紐づけ。

CSRF/レート制限
- CSRF: middlewareでダブルサブミットCookie `csrf-token` を発行、APIは`x-csrf-token`必須
- レート制限: 簡易IPベース（`lib/rateLimit.ts`）。本番はRedis等に置換推奨

モックモード
- `DATABASE_URL` 未設定時のみ簡易モック（既存のモックAPI）

ローカルセットアップ
1) Node 18+（推奨は 20）。`.nvmrc` あり
2) 依存インストール: `npm i`
3) `.env` 作成: `.env.example` をコピーし、`DATABASE_URL` と `ADMIN_TOKEN` を設定
4) `db/schema.neon.sql` をNeonに適用
5) 開発起動: `npm run dev` → `http://localhost:3000`

Supabase準備手順（本番モード）
1) SQL適用: `db/schema.sql` → `db/policies.sql` → `db/triggers.sql`
2) Auth Redirect URLsに本番URLを追加
3) Vercel環境変数: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Vercel準備（公開前の設定）
- リポインポート（Framework: Next.js）
- `vercel.json` により SW は no-store 配信
- PWAアイコンを `public/icons/icon-192.png`, `-512.png` に配置（任意）

既存サイトへ統合する場合（サブパス `/month-challenge` 推奨）
1) ページを `app/month-challenge/{calendar,list,admin}` として配置（相対リンク修正）
2) APIは `app/api/entries...` をプロジェクト直下に配置（URLは共通）
3) 依存が足りなければ `package.json` に追記（Next/Reactバージョンは既存に合わせる）
4) Tailwindの`content`に新フォルダを追加
5) ナビにリンク追加（例: 「月チャレ」→ `/month-challenge/list`）
6) SupabaseのDDL/RLS/トリガーを適用（既存profiles等と整合性確認）
7) 既存のmiddleware/CSRF/セッション方針に合わせて必要なら統合

テスト
- 単体: `npm run test`（Vitest）
- 既存に合わせてE2E（Playwright）を追加可能（未実装）

既知の注意点/今後の改善
- Service Workerのオフライン送信キューは既存SWがある場合は統合作業が必要
- レート制限はインメモリのため多インスタンスでは無効（Redis推奨）
- 管理APIの監査項目はDBレベルの厳格化（CHECK/トリガー）も検討可能

連絡事項
- 変更・運用の要点は `README.md` と本ドキュメントに集約
- DB変更は必ずステージングで検証後に本番へ
