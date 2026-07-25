# 未実装の検討メモ

**まだ実装していない**構想の置き場。着手するときに読む。
実装したら該当セクションを削除し、`HISTORY.md` に記録を移す。

---

## 月初制限機能（毎月1〜4日はスタンプを押せなくする）

### 実装箇所
- 共通ロジック: `lib/restrictions.ts` を新設
- バックエンド: `app/api/entries/today/route.ts`
- フロント: `components/CalendarGrid.tsx`（UI無効化）

### 必須の注意点

**日付は必ず `getJstTodayDate()` を使う。** 過去に2回、UTCとJSTの取り違えで不具合を出している（`HISTORY.md` の 2025-09-30 / 2025-10-02 参照）。午前0時境界のテストは省略しないこと。

**フロントのUI無効化だけでは不十分。** APIを直接叩けば回避できるので、バックエンドでも必ず検証する。

```ts
if (isDayRestricted(iso)) {
  return NextResponse.json({
    error: 'day_restricted',
    message: '毎月1日〜4日はスタンプを押せません',
    restricted_until: calculateNextAllowedDate(iso)
  }, { status: 403 });
}
```

### 設計方針
- 既存データには影響させない（制限は新規作成時のみ）
- 段階的に入れる: バックエンド制限 → フロントUI → 管理機能
- 緊急解除用に環境変数 `DISABLE_ALL_RESTRICTIONS=true` を用意する

### テスト必須項目
月末→月初の境界 / タイムゾーン変換 / API直接呼び出しでの制限 / 既存機能への影響なし

---

## 機能拡張の候補

- CSVエクスポートの拡充、フィルタリング、期間指定
- Neon接続状況の可視化、APIレスポンス時間の監視

---

## VPS移行の検討（結論: 見送り）

コスト削減の可能性はあるが、サーバー構築・DB移行・監視・セキュリティ管理で運用工数が大幅に増える。**現在の Vercel + Neon 構成を継続する**判断。再検討する場合はこのトレードオフから。
