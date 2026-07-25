# システム構成

CLAUDE.md から詳細を分離したもの。構成を変更したときに更新する。

## 技術スタック

| 層 | 採用技術 |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data Fetching | SWR |
| Database | Neon PostgreSQL（唯一のストレージ） |
| Auth | 自前の HS256 トークン + httpOnly Cookie |
| Hosting | Vercel（リージョン sin1 / プロジェクト名 `month-challenge-auth`） |
| 画像保存 | Neon（PWAアイコン） |

Redis は 2025-11-01 に廃止済み。`REDIS_URL` は Vercel からも削除されている。

## 認証の流れ

1. `POST /api/auth/login` … パスワード照合後、`signToken()` で30日有効のトークンを発行し `auth-token` Cookie（httpOnly / sameSite=lax）に格納
2. `middleware.ts` … 全パスで Cookie の**署名と有効期限を検証**。無効なら Cookie を削除して `/auth/sign-in` へリダイレクト（`/api/*` は 401 JSON）
3. `GET /api/auth/me` … 検証に失敗したら 401。クライアントは `useUser()` の `errorStatus` で判定する
4. 管理APIは `lib/admin-auth.ts` でサーバー側でも権限を確認する

トークン署名は Node 用（`lib/crypto.ts`）と Edge 用（`lib/edge-token.ts`）の2実装がある。middleware は Edge Runtime で動くため `node:crypto` が使えないのが理由。**片方を変更したらもう片方も必ず合わせること。**

## 主なAPIエンドポイント

| パス | 用途 |
|---|---|
| `/api/auth/login` `/register` `/logout` `/me` | 認証 |
| `/api/entries` `/api/entries/today` | スタンプの取得・登録 |
| `/api/admin/users` `/users-list` | ユーザー管理 |
| `/api/admin/daily-stats` | 日別チェック状況 |
| `/api/admin/user-ranking` | ユーザー別ランキング |
| `/api/admin/overview` | 集計（CSV出力対応） |
| `/api/admin/cache-worker` `/cache-rebuild` | `ADMIN_CRON_TOKEN` で保護（現在は未使用） |

## データベース

インデックスは 2025-09-27 の診断で「追加不要」と結論済み。

- `auth_entries(user_id, entry_date)` … チェック管理用
- `auth_users(email)` … ログイン用

規模の見通し: 現在37ユーザー / 482エントリー。500ユーザーまでは現構成で問題なし。

## 構築済みだが使っていないもの

以下は将来の拡張用に残してあるだけで、**現在の処理経路には入っていない**。

- キャッシュテーブル `auth_daily_stats_cache` / `auth_daily_totals_cache`
- ジョブキュー `auth_daily_stats_jobs`
- `/api/admin/cache-worker`（Vercel Hobby Plan で1分ごとの cron が使えずcron削除）

`/api/admin/daily-stats` はキャッシュを使わず `auth_entries` から直接取得している。

## 表示速度の工夫

チェック管理ページは 2025-09-27 に段階的読み込みへ変更し、初期表示が約70%改善した。

- 軽量なユーザーリストを先に返してチェック操作を即座に使えるようにする
- ランキングは「集計表示」ボタンを押したときだけ取得する
- SWR でクライアント側キャッシュ

## 環境変数

```
DATABASE_URL_AUTH     Neon の接続文字列
AUTH_SESSION_SECRET   トークン署名の秘密鍵（Development/Preview/Production 共通）
ADMIN_EMAILS          管理者として初期登録するメールアドレス
ADMIN_CRON_TOKEN      cache-worker / cache-rebuild の認可用
```

`AUTH_SESSION_SECRET` が3環境で共通のため、Preview で発行したトークンは本番でも有効。**この値を変更すると全ユーザーが強制ログアウトされる。**
