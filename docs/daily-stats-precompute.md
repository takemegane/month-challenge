# 日別チェック事前集計プロジェクト

## 1. 背景と目的
- 管理画面の「日別チェック状況」が現在は都度集計で応答に時間がかかっている。
- 月ごとの集計結果をあらかじめ作り置きし、画面リクエストに即時返答できるようにする。
- プロジェクト完了後は本ドキュメントを削除し、改善内容のサマリーを履歴として別途残す。

## 2. 現状の流れ
1. 画面が `/api/admin/daily-stats` に月を指定して問い合わせる。
2. API が対象期間の `auth_users` と `auth_entries` を全件取得。
3. 取得データをサーバー内でユーザー別・日付別に集計。
4. JSON を返却し、フロントでテーブルに整形して表示。
- ボトルネック: ステップ 2-3 の都度集計。

## 3. 目標と指標
- 応答時間: 現在より大幅に短縮し、体感で待ち時間を感じないレベル(<200ms)を目指す。
- データ鮮度: 毎日の更新・手動チェック反映で遅延が最大でも数分以内。
- 信頼性: 集計失敗時にも再試行やフォールバックでデータ欠損を防ぐ。

## 4. 現状計測（2025-10-23 JST）
- 計測方法: `psql` で本番と同じ Neon 接続先に対して都度集計と同等クエリを実行し、`\timing` で応答時間を取得。
- データ量 (現状): `public.users` 8 行、`public.entries` 8 行（2025-09 月の記録のみ）。
- クエリ応答時間（ネットワーク往復含む）
  - ユーザー一覧: `SELECT id, name FROM public.users ORDER BY name;` → **136 ms**。
  - 該当月の記録: `SELECT user_id, entry_date FROM public.entries WHERE entry_date BETWEEN '2025-09-01' AND '2025-09-30' ORDER BY entry_date;` → **100 ms**。
- 想定運用規模シミュレーション: トランザクション内で 200 名（`perf_user_001`〜）×30 日 = 6,000 件のダミー記録を一時投入し計測後にロールバック。
  - 計測時データ量: `public.users` 208 行、`public.entries` 6,008 行。
  - ユーザー一覧: 上記と同クエリで **191 ms**。
  - 該当月の記録: 同クエリで **392 ms**。
  - 備考: ネットワーク往復込みの実測。結果はフルコミットしておらず、本番データへの影響なし。
- メモ: 現行コードは `auth_users` / `auth_entries` を参照しており、DB スキーマ差異があるためローカル検証ではテーブル名の対応関係を確認する必要がある。

## 5. 基本方針
- 月単位の集計結果を別テーブル（例: `auth_daily_stats_cache`）に保存。
- バッチ処理またはキュー処理で定期的に再集計する。
- `/api/admin/daily-stats` はキャッシュテーブル優先で応答し、必要に応じてフォールバック。

## 6. 想定データ構造
- 要件
  - 月単位 (YYYY-MM) でキーを持ち、31 日分のチェック有無と件数を高速に取り出せること。
  - ユーザー別の詳細（名前、合計、チェック付与日）と日別合計を分離し、読み出し先が明確になること。
  - 再計算や差分適用の状態を把握できるメタ情報（更新日時・バージョン）を保持すること。
  - 本番スキーマは `auth_users` / `auth_entries` を参照するため、外部キーやジョイン時のテーブル対応を明記しておく。

### 6.1 `auth_daily_stats_cache` テーブル案（ユーザー×月）

```sql
create table if not exists auth_daily_stats_cache (
  month text not null,               -- YYYY-MM
  user_id uuid not null references public.users(id) on delete cascade,
  total integer not null,            -- 月内のチェック件数
  marked_days bit(31) not null,      -- 月の日数分のビットフラグ（1 = チェック済）
  marked_dates text[] not null,      -- ISO 日付リスト（API レスポンス互換用）
  calculated_at timestamptz not null default now(),
  source_version text not null,      -- 再計算バッチ識別子（例: 2025-10-23T02:00Z）
  primary key (month, user_id)
);

create index if not exists idx_auth_daily_stats_cache_user_month
  on auth_daily_stats_cache(user_id, month);
```

- `marked_days`: 当月 31 日分を上位から詰め、日付→ビット位置変換で差分更新を高速化。
- `marked_dates`: 現行 API が返す `dates: string[]` をそのまま再利用するための冗長データ。非表示 API に移行できれば削除候補。
- `source_version`: バッチの再実行や差分適用時の重複防止に利用。

### 6.2 `auth_daily_totals_cache` テーブル案（日付×月）

```sql
create table if not exists auth_daily_totals_cache (
  month text not null,
  day date not null,
  total integer not null,
  calculated_at timestamptz not null default now(),
  source_version text not null,
  primary key (day)
);

create index if not exists idx_auth_daily_totals_cache_month
  on auth_daily_totals_cache(month);
```

- `primary key(day)` で同一日付の重複を防止（実装上は月跨ぎの再計算時に安全）。必要に応じて `(month, day)` の複合主キーに変更可。
- 月全体のグラフ表示などで日付順に並べ替えやすくするため、`day` 列を `date` 型で保持。

### 6.3 メタテーブル（オプション）

```sql
create table if not exists auth_daily_stats_tasks (
  month text primary key,
  status text not null check (status in ('pending','running','succeeded','failed')),
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_error text
);
```

- バッチ結果の状態管理や再試行トリガーに使用。任意だが、失敗時の追跡や UI 表示に役立つ。

### 6.4 保持・更新ポリシー案
- 保持期間: 過去 18 ヶ月分を保存し、それ以前は月次バッチで削除（`delete from ... where month < ?`）。
- 再計算タイミング: 毎日深夜に当月・前月をフル再計算し、差分イベントでは `marked_days` と `marked_dates` の部分更新を行う。
- 差分適用: 1 件の追加/削除であれば該当ビットを反転し `total` を増減、`marked_dates` を更新。同時に `auth_daily_totals_cache` の該当日の `total` も加減算。
- 整合性チェック: 週次の整合性ジョブで、キャッシュとリアルテーブルの件数差分を検出し、差異があれば再計算タスクをキューに投入。

### 6.5 スキーマ差異メモ
- 本番環境の Neon DB では `public.users` / `public.entries` が唯一のテーブルであり、API から参照している `auth_users` / `auth_entries` という名前は存在しない。
- API 実装をキャッシュに対応させる際は、`auth_*` 名のクエリを `public.*` に揃えるか、ビュー／エイリアスを作成して互換性を確保する必要がある。
- キャッシュテーブルも `public` スキーマに作成する想定とし、外部キーも `public.users(id)` を参照する。

## 7. 処理フロー案
### 7.1 トリガー
- 日次バッチ（深夜）で当月・前月を再計算。
- チェック操作 API 完了時に対象ユーザー＋日付のみ差分更新キューに投入。

### 7.2 フル再計算ワーカー（擬似コード）

```pseudo
for target_month in [current_month, previous_month]:
  mark_task_running(target_month)
  try:
    begin transaction
      entries = select user_id, entry_date
                from public.entries
                where entry_date between month_start(target_month) and month_end(target_month)
      grouped = group entries by user_id
      upsert into auth_daily_stats_cache
        (month, user_id, total, marked_days, marked_dates, calculated_at, source_version)
        values computed from grouped data
      totals = aggregate entries by entry_date
      upsert into auth_daily_totals_cache (month, day, total, calculated_at, source_version)
      delete obsolete cache rows for target_month not present in new data
    commit
    mark_task_success(target_month)
  except error as err:
    rollback
    mark_task_failed(target_month, err)
```

### 7.3 差分更新ワーカー（擬似コード）

```pseudo
while queue not empty:
  job = dequeue()
  { user_id, entry_date, action, month } = job
  begin transaction
    stats = select * from auth_daily_stats_cache
            where month = month_of(entry_date) and user_id = user_id
    if stats missing:
      enqueue full_recompute for month
      continue

    day_index = day(entry_date) - 1
    if action == 'add' and bit_is_set(stats.marked_days, day_index):
      // already marked; skip
    else if action == 'add':
      set_bit(stats.marked_days, day_index)
      stats.total += 1
      stats.marked_dates append entry_date
    else if action == 'remove' and bit_is_clear(stats.marked_days, day_index):
      // already cleared; skip
    else:
      clear_bit(stats.marked_days, day_index)
      stats.total -= 1
      stats.marked_dates remove entry_date

    update auth_daily_stats_cache set ... where month = month and user_id = user_id

    update auth_daily_totals_cache
      set total = total ± 1,
          calculated_at = now()
      where day = entry_date
    if row not found and action == 'add':
      insert new total row with value 1
    if result total == 0 and action == 'remove':
      delete total row (optional)
  commit
```

### 7.4 API
- キャッシュが最新ならそれを返す。
- キャッシュなし/古い場合はフォールバックでオンデマンド計算、完了後にキャッシュ更新をスケジュール。

### 7.5 シーケンス概要
1. ユーザーがチェック操作 → `/api/admin/entries` が完了したら差分ジョブをキューに追加。
2. 差分ワーカーが即時処理し、キャッシュが空ならフル再計算を予約。
3. 日次バッチワーカーが当月・前月を再生成し、不要データをクリーンアップ。
4. `/api/admin/daily-stats` はキャッシュ読み込み（欠損時のみオンデマンド計算＋再計算キュー）。

### 7.6 既存コードへの組み込みポイント
- 手動チェック操作: `auth-app/app/api/admin/entries/route.ts` の POST/DELETE 完了後に差分ジョブを投入。
- 自動チェック登録: `auth-app/app/api/entries/today/route.ts` で 1 日 1 回の追加が行われるため、成功時に差分ジョブを投入。
- バッチ同期処理: `auth-app/app/api/cron/sync/route.ts` で外部ソースから一括挿入が行われる場合は、完了後に対象月をフル再計算キューへ投入。
- その他: 将来的にまとめ更新が追加された場合は同様にジョブ投入を検討。

### 7.7 ジョブ投入インターフェース案
- `auth-app/lib/cache-jobs.ts` に差分ジョブを登録・取得する関数をまとめる。
  - `enqueueDailyStatsDiff({ userId, entryDate, action, source })`
  - `claimDiffJobs(limit)` : `select ... for update skip locked` で未処理の行を取得。
  - `markDiffJobsDone` / `markDiffJobsFailed` で処理結果を更新。
- ジョブは Neon 上の `auth_daily_stats_jobs` 表で管理し、`status` と `locked_at` を持たせて競合を防ぐ。
- API ハンドラではチェック操作が完了した直後に `enqueueDailyStatsDiff` を呼び出す。

### 7.8 Neon 上で完結させる運用案
- `app/api/admin/cache-worker/route.ts` がジョブ表から数十件ずつ取得し、`applyDiffJobs` でキャッシュを更新する。
- Vercel Cron（例: 毎分）で `cache-worker` を呼び出し、溜まったジョブを消化。
- `auth_daily_stats_jobs` の `locked_at` が古い場合は、Cron 実行前に `releaseStaleJobs` で `pending` に戻す。
- 手動チェック API は同期更新を試み、失敗時のみジョブに頼る二段構えを維持。
- `locked_at` が古いジョブは解放して再処理できるようにする（実装メモ参照）。

### 7.9 テーブル準備手順
- 追加する表は `db/migrations/202410231200_add_daily_stats_cache.sql` にまとめた。
  - 月×人の表 `auth_daily_stats_cache`
  - 月×日の表 `auth_daily_totals_cache`
  - 進捗を記録する表 `auth_daily_stats_tasks`
  - 差分ジョブを保持する表 `auth_daily_stats_jobs`
- 手順
  1. 本番と同じデータベースに接続し、上記 SQL を実行する。
  2. 既に同名の表がある場合でも `if not exists` で安全にスキップされる。
  3. 実行後に `\dt auth_daily_%` で表が存在することを確認する。

### 7.10 `cache-worker` / `cache-rebuild` API の処理ルール案
- `cache-worker`（差分処理）
  - 1 回の実行で処理する最大件数: 200 ジョブ（秒間数件程度を想定）。
  - タイムアウト対策: 1 件あたりの処理で 100ms を超えたらループを抜ける（`Date.now()` で経過時間を測定）。
  - 失敗時: 現在のジョブを `failed` リストに移し、再実行用に `auth_daily_stats_tasks` に登録。
  - 応答: 処理件数と残件数の概算を JSON で返す。
- `cache-rebuild`（フル再生成）
  - 対象: クエリパラメータがなければ当月・前月を処理。指定があれば単一月。
  - 1 回の実行で許す上限時間: 20 秒。超過する場合は `202 Accepted` を返し、残りは次の Cron で処理。
  - 再入場防止: `auth_daily_stats_tasks` の `status` を `running` にし、同じ月の重複実行を弾く。
  - 完了後: `status='succeeded'`, `last_finished_at=now()` を更新し、レスポンスで更新対象の月と件数を返す。

### 7.11 同期フォールバック更新の方針
- 対象: `/api/admin/entries`（手動付与/削除）と `/api/entries/today`（本人が押す今日のボタン）。
- 動き
  1. 本来の登録・削除処理が成功した直後に、軽量な同期更新を試みる。具体的には `auth_daily_stats_cache` の該当行を `update` し、`marked_days` と `total` を書き換える。このとき行が存在しなければ同期処理を中断。
  2. 同期更新が成功したら、ジョブ表にも登録しておき（重複処理を避けるために冪等なチェックを行う）、後続の確認処理が通るようにする。
  3. 同期更新でエラーが出た場合は、主要処理のレスポンスはそのまま返し、ジョブ投入だけ行う。
- 同期処理の条件
  - API が Neon に接続でき、更新対象の月が現在または前月以内。
  - `auth_daily_stats_cache` に元データが存在し、`total` の増減で負にならないことが確認できる。
  - 1 リクエスト内で 2 回までリトライ（例: 更新競合）を許容し、それ以降はジョブに任せる。
- 期待効果: Cron の待ち時間を待たずに画面へ反映させ、体感遅延を抑える。ジョブは冪等に設計しておくため、同期更新済みでも再適用されても問題ないようにする。

### 7.12 実装計画メモ（API ルート）
- `app/api/admin/cache-worker/route.ts`
  - `POST` のみ受け付け、Cron からの認証用パラメータ（例: `?token=...`）をチェック。
  - 処理フロー
    1. `auth_daily_stats_jobs` から `select ... for update skip locked` で最大 200 件を取得し、`status='processing'` に更新。
    2. 取得したジョブを順に処理し、成功したものは `status='done'`、失敗したものは `status='failed'` として保存。
    3. 処理中に経過時間が 20 秒に近づいたらループを終了し、残件数をレスポンスに含める。
  - レスポンス例: `{ processed: 120, failed: 2, remaining: 45 }`

- `app/api/admin/cache-rebuild/route.ts`
  - `POST` を想定。`month` パラメータ（未指定なら当月・前月）とトークンを受け取る。
  - 処理フロー
    1. `auth_daily_stats_tasks` の該当月が `running` でないか確認し、重複なら 409 を返す。
    2. `status='running'` に更新してから再計算処理を実施（7.2 の擬似コード参照）。
    3. 処理時間が 20 秒を超えそうなら `status='pending'` に戻し、レスポンスは 202 (`{ status: 'partial', processedUsers: 800 }`)。
    4. 正常終了時は `status='succeeded'`、エラー時は `status='failed'` と `last_error` を更新。

- モジュール構成
  - 共通ロジックは `auth-app/lib/daily-stats-cache.ts` にまとめ、API ルートから呼び出す。
  - ジョブの登録と取得は `auth-app/lib/cache-jobs.ts` で行い、Neon 上の表を利用する。
  - エラーハンドリングは `logger` に詳細を残しつつ、API では Guarded JSON を返す。

### 7.13 実装メモ - `applyDiffJobs`
- 入力: `auth_daily_stats_jobs` から取得したジョブ配列（`DiffJob`）と締切ミリ秒（`Date.now() + 20000` など）。
- 流れ
  1. 残り時間をチェックし、締切が迫っている場合は未処理ジョブを `pending` に戻す。
  2. ユーザーと月の行を `auth_daily_stats_cache` から読み込み。行が無い場合は `rebuild` の予約を行い、失敗扱い。
  3. `marked_days` の対象ビットをオン/オフし、`total` を増減。ビット操作は SQL（`set_bit`/`clear_bit`）を使うか、アプリ側で文字列として組み立て直す。
  4. `marked_dates` は `text[]` として扱い、追加は `array_append`、削除は `array_remove` を利用。
  5. `auth_daily_totals_cache` の該当日について、`total = total ± 1` の更新。負になりそうなら再計算をスケジュール。
  6. 処理成功なら `status='done'`、例外が発生したら `status='failed'` として記録。
  7. 締切超過で処理できなかったジョブは `status='pending'` に戻す。
- 補足
  - 競合で `UPDATE` が失敗した場合は 1 回再取得してリトライ。それでも失敗なら `failed` として記録。
  - `logger.debug` で `processed` と `failed` の内訳・所要時間を記録。

### 7.14 実装メモ - `rebuildMonthlyCache`
- 入力: 月（未指定なら当月・前月）と締切ミリ秒。
- 流れ
  1. 対象月を配列化（例: 未指定 → `[current, previous]`）。
  2. 月ごとに `auth_daily_stats_tasks` を確認。`running` の場合は 409 を返すか、次の月へスキップ。
  3. トランザクション開始。`public.entries` から該当期間のデータを取得し、ユーザー別に集計。
  4. `auth_daily_stats_cache` に `insert ... on conflict (month, user_id) do update` で反映。`marked_days` は JS でビット列を組み立てる。
  5. 日別合計は `auth_daily_totals_cache` に `insert ... on conflict` で上書きし、不要な日付は `delete`。
  6. 処理しなかったユーザー行や日付行を削除して整合性維持。
  7. 時間が足りない場合は `roll back` して `status='pending'`、レスポンスは `partial`。成功時は `commit` → `status='succeeded'`。
  8. エラー時は `status='failed'` にし、`last_error` にメッセージを残す。
- 補足
  - 指定月が単一の場合でも同じ処理を流用。
  - 初回実行で `auth_daily_stats_tasks` エントリがない場合は `insert` してから `running` に更新。

## 8. フロントエンド影響
- エンドポイントは同じだが、レスポンスが軽量になる想定。
- リアルタイム性が高い操作（手動チェック）後は、即時差分反映できるか確認。
- キャッシュ生成中は前回のデータを返し、フロントに「更新中」表示を出す仕組みを検討。

## 9. タスク計画（初期ドラフト）
1. 現状計測: API 応答時間とデータ量を測定。（2025-10-23 実施済み）
2. データモデル詳細設計: キャッシュテーブルスキーマ、インデックス、整合性方針。
3. 集計ワーカー設計: バッチ/差分の処理手順と再試行戦略。
4. API 改修: キャッシュ読取＋フォールバックロジック。
5. フロント調整: 新レスポンスとの整合、状態表示。
6. モニタリング: ログ・メトリクスを整備。
7. テストと段階的リリース。

## 10. 未確定事項・確認事項
- 差分更新に必要な既存 API の Hook ポイントは揃っているか。
- キャッシュテーブルのデータ量上限と保管期間の方針。
- バッチ環境（cron, queue）の構築有無。
- 万が一集計が壊れた場合のロールバックや手動再計算手順。

## 11. リスクと対策
- データ不整合: トランザクション、再計算コマンドの用意。
- バッチ失敗: アラートと再試行、旧データの継続利用。
- 差分更新の抜け漏れ: 更新イベントの統合テスト、ログ監視。

## 12. 成果物と後処理
- プロジェクト完了時に本ドキュメントを削除。
- 最終成果サマリー（改善内容・計測結果・今後の課題）を短いテキストで履歴に残す。

## 13. 連絡ルール
- 作業の説明や相談を行うときは、専門用語を避け、わかりやすい言葉でまとめる。

## 14. テーブル準備手順
- 追加する表は `db/migrations/202410231200_add_daily_stats_cache.sql` にまとめた。
  - 月×人の表 `auth_daily_stats_cache`
  - 月×日の表 `auth_daily_totals_cache`
  - 進捗を記録する表 `auth_daily_stats_tasks`
  - 差分ジョブを保持する表 `auth_daily_stats_jobs`
- 手順
  1. 本番と同じデータベースに接続し、上記 SQL を実行する。
  2. 既に同名の表がある場合でも `if not exists` で安全にスキップされる。
  3. 実行後に `\dt auth_daily_%` で表が存在することを確認する。
