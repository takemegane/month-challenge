# 月チャレ（auth-app）

コミュニティ向けの日次スタンプ記録アプリ。メールアドレスとパスワードでログインする。

- 本番: https://month-challenge-auth.vercel.app/
- 場所: `~/dev/month-challenge/auth-app`

## コマンド

```bash
npm run dev -- -p 3001                         # 開発サーバー
node node_modules/typescript/bin/tsc --noEmit   # 型チェック（約1.3秒）
```

実装後は型チェックを必ず通す。**build は指示があるときだけ**実行する（dev サーバーを壊すことがある）。lint は未設定。

## 最重要ルール

- 迷ったら止まる。推測で進めない。不明点は実装前に質問する
- 動作確認できる単位で必ず止まり、ユーザーの確認を待つ
- 秘匿情報（APIキー・シークレット・パスワード）の値そのものを出力しない。一致確認が必要なときは yes/no だけ答える
- 同じ指摘を2回受けたら、このファイルへの追記を提案する（**追記は勝手に行わず承認を得る**）

## プロジェクト構成

```
app/          画面と API ルート（App Router）
  api/auth/     ログイン・登録・ログアウト・セッション確認
  api/admin/    管理機能（すべて lib/admin-auth.ts で権限確認）
components/   Header, CalendarView, CalendarGrid など
hooks/        use-api.ts … SWR フックの定義場所
lib/          crypto.ts(Node用署名) edge-token.ts(Edge用検証) db.ts date.ts
middleware.ts 全パスの認証ゲート
docs/         詳細ドキュメント（下記）
```

## 触らない場所

- `.env` `.env.local` `.env.*.local` … 読まない・変更しない
- リポジトリ直下（`../app` `../lib` など）は**別プロジェクトの旧システム**。auth-app の作業では触らない

## 落とし穴（過去に踏んだもの）

- **日付は必ず `getJstTodayDate()` を使う。** `new Date().toISOString()` や `toLocaleString()` はUTC基準になり、JST午前0時〜8時台に前日・前月がずれる。2回同じ事故を起こしている
- **認証は middleware に一本化した。** 各ページで Cookie の存在チェックを書き足さない。存在だけでは期限切れ・改ざんを弾けない
- **`lib/crypto.ts` と `lib/edge-token.ts` は同じ署名形式を扱う。** 片方を変えたら必ずもう片方も合わせる
- **UI での無効化はガードにならない。** API を直接叩けば回避できるので、サーバー側で必ず検証する
- `AUTH_SESSION_SECRET` を変更すると全ユーザーが強制ログアウトされる

## Git ルール

- 機能単位でコミットする。大きくまとめない
- Conventional Commits（feat: / fix: / chore: / docs: / refactor:）
- **Co-Authored-By 行を付けない**
- **commit と push は分ける**。push は指示があるまでしない（本番へ自動デプロイされるため）
- このファイルの更新は、関連する実装と同じコミットに含める

## 実行前に必ず提案して承認を待つ操作

コミット / push / ファイル削除 / DB 操作（migrate・seed・書き込み）/ 環境変数の変更 / 依存パッケージの追加・削除 / 設定ファイル・スキーマの変更

## セキュリティ

- 環境変数は `.env.local` に置き、コミット禁止
- サーバー専用キーはクライアントに出さない
- すべての API / サーバー処理で権限チェックを行う
- `curl -c` で作った Cookie ファイルをコミットしない（過去に実トークンを混入させた）

## コーディング規約

- 型は厳格に。`any` 禁止（HTTPエラーは `lib/swr-config.ts` の `HttpError` を使う）
- Server Component を優先。`'use client'` は必要なときだけ
- SWR は `null` を渡すと呼び出しを無効化できる

## 詳細ドキュメント

必要になったときだけ読む。

- `docs/ARCHITECTURE.md` … システム構成、認証の流れ、API一覧、環境変数
- `docs/HISTORY.md` … 過去の変更と、その理由
- `docs/IDEAS.md` … 未実装の構想（月初制限機能など）
