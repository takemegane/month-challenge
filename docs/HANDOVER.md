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

---

認証版（auth-app）追加と進捗（WIP）

目的
- 既存サイトは維持しつつ、メール+パスワードによるログイン版を同一リポ内で並行運用（URLは別）。
- 既存UIと同一の見た目/挙動、右上プルダウン無し（自分のデータのみ）。

配置
- `auth-app/`（Next.js App Router）
  - 画面: `/auth/sign-in`, `/auth/sign-up`, `/calendar`
  - API: `/api/auth/{register,login,logout,me}`, `/api/entries{,/today}`
  - DBスキーマ: `auth-app/db/schema.neon.sql`（`auth_users`, `auth_entries`）

CI/CD（GitHub Actions）
- ワークフロー: `.github/workflows/vercel-deploy.yml`
  - PR: 既存/認証版それぞれPreviewを作成し、PRにURL自動コメント
  - main push: 既存/認証版ともに本番デプロイ
- Secrets（GitHub）:
  - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`（既存）
  - `VERCEL_PROJECT_ID_AUTH`（認証版）

Vercel
- 認証版プロジェクトを新規作成（Root Directory=`auth-app`）。
- 環境変数（Production/Preview両方）: `DATABASE_URL_AUTH`, `AUTH_SESSION_SECRET`, `ADMIN_EMAILS`
- 既存側は main の自動本番デプロイを抑止（`vercel.json` の `ignoreCommand`）し、Actionsで統一。

実装済みの主な変更
- API/認証:
  - `register/login/logout/me` 実装。トークンはHS256署名のJWTをHttpOnly Cookie（SameSite=Lax, Secure, 30日）に保存。
  - base64url処理/署名検証の不具合を修正。
  - email/name のtrim・小文字化を導入し、UIからの400を起きにくく。
- UI/レイアウト:
  - Tailwind導入（`auth-app/tailwind.config.ts`）。
  - 既存の`CalendarView/Grid`を移植し、同等UI/挙動に統一。
  - ヘッダーをコンポーネント化し、`/auth`配下ではナビを非表示（カレンダーリンク重複解消）。
  - 背景グラデのCSSフォールバックを `auth-app/app/globals.css` に追加。
- ビルド/設定:
  - PostCSSをCJS化: ルート/認証版ともに `postcss.config.cjs`。
  - 認証版 `package.json` から `"type": "module"` を削除（ESMによるPostCSS読み込み不整合を回避）。

未解決/要追跡
- 一部プレビューでログイン/登録ページにスタイルが反映されず白背景となる事象。
  - 現在の仮説: PostCSS解決の参照順またはキャッシュ。`postcss.config.cjs` への統一とESM無効化は済み。
  - 次の切り分け: PreviewのDevToolsで `<body>` の `background-image`（Computed）を確認。Tailwindユーティリティ適用前提のクラス名が反映されているかを併記確認。
  - 必要なら、`app/layout.tsx` 側に style 属性で明示的に背景を指定して最終防衛（CSS読み込み失敗時でも白にならない）。

再現/検証メモ
- コンソールからの登録/ログイン（プレビューでの最短検証）:
  1) allow pasting → Enter
  2) 登録: `await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},credentials:'include',body:JSON.stringify({email:'you+test@example.com',password:'Password123',name:'テスト'})}).then(r=>r.status)`
  3) ログイン: `await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},credentials:'include',body:JSON.stringify({email:'you+test@example.com',password:'Password123'})}).then(r=>r.status)`
  4) 認証確認: `await fetch('/api/auth/me',{credentials:'include'}).then(r=>r.json())` → `{user: ...}` になること

ロールバック/切替
- 既存サイトは常に稼働（今回の変更は`auth-app/`配下のみに影響）。
- 認証版のデプロイ停止は GitHub Actions の `deploy-auth` を一時無効化。

✅ 完了：UI/UXデザイン統一とセンタリング修正（2025-01-22）

**修正履歴と最終状態:**
1. **白背景問題の完全解決**: 
   - 原因: ダークテーマの複雑なグラデーション背景が見づらく、ユーザーから「以前の方が良かった」とのフィードバック
   - 解決: 既存カレンダーの緑系グラデーション背景(`#f0fdf4`, `#dcfce7`)に復元
   - レイアウト: `app/layout.tsx`で`radial-gradient(1200px 600px at 50% -10%, rgba(34,197,94,0.18), transparent), linear-gradient(180deg, #f0fdf4, #dcfce7)`

2. **認証ページの完全リデザイン**:
   - 要求: 「画面中央にメールアドレスとパスワード、入力欄をもっと大きく、左上の月チャレのリンクはログイン後に表示、画面のメールアドレスの上に大きく『月チャレログイン』」
   - 実装: シンプルで見やすい中央配置デザインに統一
   - タイトル: 「月チャレログイン」「月チャレ新規登録」を大きく表示
   - 入力欄: `py-5`で大きくしてモバイル使いやすさ向上
   - カラー: 既存のプライマリカラー(`#f59e0b`)統一

3. **センタリング問題の修正**:
   - 問題: 「文字や入力欄が画面の左上にある」
   - 解決: `min-h-[calc(100vh-120px)]` → `min-h-screen`に変更
   - 結果: フォームが画面全体の中央に正しく配置

4. **ヘッダー表示条件の改善**:
   - 変更: 月チャレリンクをログイン後のみ表示
   - 実装: 認証状態チェック(`/api/auth/me`)でユーザー存在時のみヘッダー表示
   - コンポーネント: `components/Header.tsx`で動的表示制御

**最新コミット情報:**
- 最新: `c152c5b` - センタリング修正（2025-01-22）
- 前回: `65935cd` - 既存デザイン統一とシンプル化
- 前回: `1f96b29` - 革新的モダンデザイン（→ユーザーフィードバックで変更）

**現在の技術仕様:**
- 背景: 既存カレンダーと同じ緑系グラデーション
- フォーム: 白半透明カード(`bg-white/80`)でglassmorphism
- 入力欄: 大きいサイズ(`px-6 py-5`)、オレンジフォーカス
- ボタン: `btn-primary`クラス（`#f59e0b`ベース）
- レスポンシブ: モバイルファースト設計、`max-w-md`で最適幅

**ファイル構造:**
- `auth-app/app/auth/sign-in/page.tsx` - ログインページ
- `auth-app/app/auth/sign-up/page.tsx` - サインアップページ  
- `auth-app/app/layout.tsx` - 全体背景設定
- `auth-app/components/Header.tsx` - 認証状態対応ヘッダー
- `auth-app/tailwind.config.ts` - プライマリカラー定義
- `auth-app/app/globals.css` - CSSクラス定義

担当者向けTODO（次回着手候補）
- [一覧] 認証版の `/list` UI の移植（1/3/6ヶ月 + CSV）
- [管理] 認証版の管理画面（メール/パスワードリセットUI）の追加
- [最適化] PostCSS警告の解消（next.config.jsのmodule type指定）
- [機能追加] ログアウト機能の実装とヘッダーメニュー
- [セキュリティ] パスワード強度チェックとバリデーション強化
