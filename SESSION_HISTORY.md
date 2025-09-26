# 月チャレンジ認証アプリ - セッション履歴

## 2025年9月23日 - セッション記録

### 実装された機能
1. **認証システム**
   - JWT トークンベース認証
   - メール/パスワードログイン
   - セッション管理（httpOnly cookies）
   - ミドルウェアによるルート保護

2. **カレンダー機能**
   - 月次カレンダー表示
   - 日別チャレンジ完了マーク
   - 月間ナビゲーション（6ヶ月制限）
   - モバイル対応レスポンシブデザイン

3. **管理者システム**
   - 管理者専用画面
   - ユーザー管理（作成・削除・権限変更）
   - チェック項目の手動編集（付与・削除）
   - 管理者権限の付与・剥奪機能

4. **UI/UX**
   - モバイルファースト設計
   - 直感的なナビゲーション
   - Orange系カラーテーマ
   - アクセシビリティ対応

### 技術スタック
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: JWT + httpOnly cookies
- **データベース**: In-memory simulation (globalThis)
- **パスワードハッシュ**: scrypt

### 主要コンポーネント
```
/auth-app/
├── app/
│   ├── auth/sign-in/page.tsx          # ログインページ
│   ├── auth/sign-up/page.tsx          # 登録ページ
│   ├── admin/page.tsx                 # 管理者画面
│   ├── calendar/page.tsx              # カレンダーページ
│   ├── list/page.tsx                  # 一覧ページ
│   └── api/
│       ├── auth/                      # 認証API
│       ├── admin/                     # 管理者API
│       └── entries/                   # エントリAPI
├── components/
│   ├── Header.tsx                     # ヘッダーナビゲーション
│   ├── AuthLayout.tsx                 # レイアウト
│   ├── CalendarView.tsx               # カレンダー表示
│   └── CalendarGrid.tsx               # カレンダーグリッド
├── lib/
│   ├── db.ts                          # データベース管理
│   └── crypto.ts                      # 暗号化・JWT
└── middleware.ts                      # 認証ミドルウェア
```

### 解決した問題

#### 1. リロード後のシステム停止問題
**症状**: ページリロード後にシステムが動作しなくなる
**原因**:
- デフォルト管理者ユーザーの作成タイミング
- ミドルウェアが静的ファイルをブロック
- データベース永続化の問題

**解決策**:
```typescript
// lib/db.ts - デフォルト管理者の確実な作成
function ensureDefaultAdmin() {
  if (!globalThis.globalUsers) {
    globalThis.globalUsers = [];
  }
  const existingAdmin = globalThis.globalUsers.find(u => u.email === 'admin@example.com');
  if (!existingAdmin) {
    const adminUser = {
      id: 'admin-default',
      email: 'admin@example.com',
      password_hash: 'scrypt:64a30b4bd8e0a1c2:...',
      name: '管理者',
      is_admin: true
    };
    globalThis.globalUsers.push(adminUser);
  }
}

// middleware.ts - 静的ファイルの除外
if (
  path.startsWith('/_next/') ||
  path.includes('.') && (
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    // ... その他の静的ファイル拡張子
  )
) {
  return NextResponse.next();
}
```

#### 2. ヘッダーナビゲーション消失問題
**症状**: 「月チャレ」「今月のカレンダー」などのナビゲーションが表示されない
**原因**:
- JWTトークンのユーザーIDと実際のユーザーIDの不一致
- セッション情報の不整合

**解決策**:
```typescript
// components/Header.tsx - セッション無効時の処理
if (!user) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 text-red-800">
      セッションが無効です。
      <button onClick={() => window.location.href = "/auth/sign-in"}>
        ログインページへ
      </button>
    </div>
  );
}
```

### 現在のアカウント情報

#### 管理者アカウント
- **メール**: `admin@example.com`
- **パスワード**: `password123`
- **権限**: 管理者（全機能アクセス可能）

#### アクセスURL
- **開発サーバー**: http://localhost:3000
- **ログインページ**: http://localhost:3000/auth/sign-in
- **カレンダー**: http://localhost:3000/calendar
- **管理者画面**: http://localhost:3000/admin

### データベース構造

#### Users テーブル（シミュレーション）
```typescript
{
  id: string;
  email: string;
  password_hash: string;
  name: string;
  is_admin: boolean;
}
```

#### Entries テーブル（シミュレーション）
```typescript
{
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  created_at: string;
}
```

### 次回の改善点

1. **本格的なデータベース導入**
   - SQLite または PostgreSQL
   - データの永続化

2. **エラーハンドリング強化**
   - より詳細なエラーメッセージ
   - ログシステムの改善

3. **機能拡張**
   - パスワードリセット機能
   - メール認証
   - プロフィール編集

4. **テスト追加**
   - ユニットテスト
   - 統合テスト
   - E2Eテスト

### セッション終了状態

✅ **完全動作中**:
- 認証システム
- カレンダー機能
- 管理者機能
- ナビゲーション

⚠️ **要注意**:
- 無効セッション時は「ログインページへ」ボタンでリセット
- 管理者アカウントでのログインが推奨

**最終確認事項**: 管理者アカウント（admin@example.com / password123）でログインして全機能を利用可能

---

## 2025年9月23日 - セッション記録 (追加)

### Vercelデプロイ設定とUI改善

#### 1. Vercelデプロイ問題の解決
**問題**: auth-appがプレビューデプロイのみでプロダクションデプロイされない

**解決策**:
- ルートプロジェクト: `main` ブランチで本番デプロイ
- auth-app: `main` ブランチで本番デプロイに統一
- Root Directory設定: `auth-app` フォルダを指定

**変更内容**:
```json
// /vercel.json
{
  "git": {
    "deploymentEnabled": {
      "preview": false,
      "production": true
    },
    "productionBranch": "main"
  }
}

// /auth-app/vercel.json
{
  "git": {
    "deploymentEnabled": {
      "preview": false,
      "production": true
    },
    "productionBranch": "main"
  }
}
```

#### 2. 管理画面チェック管理の大幅改善

**改善点**:
1. **チェック操作の配置変更**: 日別チェック状況のすぐ上に移動
2. **リロードなし更新**: チェック後に画面位置を保持
3. **6行スクロール**: 日別チェック欄を縦スクロール対応
4. **テーブル構造統一**: ヘッダーとボディの列幅ずれを解消
5. **ユーザー位置固定**: 名前順ソートで操作後の位置変更を防止

**実装詳細**:
```typescript
// 名前順ソート
const sortedUsers = useMemo(() => {
  return [...(data?.users || [])].sort((a, b) => a.name.localeCompare(b.name));
}, [data?.users]);

// リロードなし更新
async function handleCheck(update: "add" | "remove") {
  // ... API呼び出し
  if (res.ok) {
    // refresh data without full reload
    fetch(`/api/admin/overview?month=${month}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => setData(json))
      .catch(() => {});
  }
}

// 6行スクロールテーブル
<div className="max-h-[12rem] overflow-y-auto overflow-x-auto">
  <table className="min-w-full border-separate border-spacing-0 text-xs">
    <thead className="sticky top-0 bg-orange-50 z-10">
      {/* ヘッダー */}
    </thead>
    <tbody>
      {sortedUsers.map((user) => (/* ユーザー行 */))}
    </tbody>
  </table>
</div>
```

#### 3. カレンダーナビゲーションのレスポンシブ対応

**改善点**:
- PC版: 従来の「← 前の月」「次の月 →」ボタンを維持
- スマホ版: コンパクトな「←」「→」ボタンでスペース節約
- 月表示とボタンを同一行に配置（スマホ版）

**実装**:
```typescript
{/* PC版: 従来のレイアウト */}
<div className="hidden sm:flex items-center justify-between">
  <button className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200">
    ← 前の月
  </button>
  <div className="flex flex-col items-center">
    <div className="text-4xl font-bold">{headerTitle}: {count} 件</div>
    <div className="mt-1 font-semibold text-2xl">{monthLabel}</div>
  </div>
  <button className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200">
    次の月 →
  </button>
</div>

{/* スマホ版: コンパクトレイアウト */}
<div className="sm:hidden space-y-2">
  <div className="text-2xl font-bold text-center">{headerTitle}: {count} 件</div>
  <div className="flex items-center justify-center gap-2">
    <button className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200">←</button>
    <div className="font-semibold text-xl px-2">{monthLabel}</div>
    <button className="px-3 py-2 rounded-md bg-orange-100 hover:bg-orange-200">→</button>
  </div>
</div>
```

### 技術的な改善

#### 1. テーブル構造の問題解決
**問題**: ヘッダーとボディを分離したテーブルで列幅がずれる

**解決策**: 単一テーブル構造 + sticky要素
```css
.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-user-column {
  position: sticky;
  left: 0;
  z-index: 20;
}
```

#### 2. パフォーマンス最適化
**改善**:
- useMemoによる効率的なソート処理
- 不要なsetLoading()削除でUX向上
- CSS変数による最小幅設定で安定したレイアウト

### 現在のフォント設定

**メインフォント**: Inter (Google Fonts)
**フォールバック**: system-ui, sans-serif
**設定場所**: `/auth-app/app/layout.tsx`

```typescript
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

### セッション終了時の状態

✅ **動作確認済み**:
- Vercel本番デプロイ: 正常動作
- 管理画面チェック管理: スムーズな操作
- カレンダーナビゲーション: PC・スマホ両対応
- ユーザー位置固定: 名前順で安定
- リロードなし更新: 操作位置保持

⚠️ **要確認**:
- 管理者ログイン: admin@example.com / password123
- デプロイURL: 最新コミットが反映済み

**今回の改善により、管理者の作業効率とモバイル体験が大幅に向上**

---

## 2025年9月26日 - プロフィール更新問題の完全解決

### 🚨 発生した問題
**症状**: アカウント設定で名前を変更しても、リロード後に元の名前に戻ってしまう現象

**影響範囲**:
- 名前の変更が保存されない
- メールアドレス変更も同様の問題
- パスワード変更は正常動作

### 🔍 問題調査プロセス

#### 1. 初期診断
- フロントエンドSWRキャッシュ更新の問題と推定
- `useUpdateProfile`フックの修正を実施
- 結果: 一時的な改善のみで根本解決せず

#### 2. API動作確認
**テスト方法**: ブラウザ開発者ツールのNetworkタブ
**結果**: `/api/auth/profile` APIは正常なレスポンスを返していた
```json
{
    "user": {
        "id": "01f8964e-d3e1-4e55-ac10-96d4f983cd9a",
        "email": "aaa@bbb.com",
        "name": "test１",
        "is_admin": false
    }
}
```

#### 3. 根本原因の特定
**発見**: デュアル書き込み（Redis + PostgreSQL）システムで、プロフィール更新処理が**完全に欠如**していた

**問題箇所**: `/auth-app/lib/db.ts`
- `update auth_users set is_admin` の処理は実装済み
- **`update auth_users set name, email, password_hash` の処理が未実装**

### 🛠️ 実装された修正

#### 1. データベース層の修正
**lib/db.ts**: プロフィール更新処理を追加

**Mock環境用**:
```typescript
// Handle general profile updates (name, email, password_hash)
if (sql.includes("update auth_users") && sql.includes("set name")) {
  const name = String(values[0] || "");
  const email = String(values[1] || "");
  const password_hash = String(values[2] || "");
  const id = String(values[3] || "");

  const users = await getUsers();
  const user = users.find((u) => u.id === id);
  if (user) {
    user.name = name;
    user.email = email;
    user.password_hash = password_hash;
  }
  return [] as T[];
}
```

**Redis環境用**:
```typescript
// Handle general profile updates (name, email, password_hash)
if (sql.includes("update auth_users") && sql.includes("set name")) {
  const name = String(values[0] || "");
  const email = String(values[1] || "");
  const password_hash = String(values[2] || "");
  const id = String(values[3] || "");

  const currentUser = await redis.hGetAll(`user_by_id:${id}`);
  if (currentUser.id) {
    const oldEmail = currentUser.email;
    const updatedUser = {
      id,
      name,
      email,
      password_hash,
      is_admin: currentUser.is_admin
    };

    // Update both Redis keys
    await redis.hSet(`user:${email}`, updatedUser);
    await redis.hSet(`user_by_id:${id}`, updatedUser);

    // If email changed, remove old email key
    if (oldEmail && oldEmail !== email) {
      await redis.del(`user:${oldEmail}`);
    }
  }
  return [] as T[];
}
```

#### 2. API検証ロジックの修正
**app/api/auth/profile/route.ts**: フィールド検証の改善

**修正前**:
```typescript
if (!body.name && !body.email && !body.new_password) {
  return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
}

const nextName = body.name ? body.name : current.name;
```

**修正後**:
```typescript
if (body.name === undefined && body.email === undefined && !body.new_password) {
  return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
}

const nextName = body.name !== undefined ? body.name : current.name;
```

#### 3. フロントエンドキャッシュ強化
**hooks/use-api.ts**: SWRキャッシュ更新の強化

```typescript
onSuccess: (data) => {
  if (data?.user) {
    // 直接キャッシュ更新
    mutate('/api/auth/me', { user: data.user }, { revalidate: false });

    // 全認証関連キャッシュを強制無効化
    mutate(
      (key) => typeof key === 'string' && key.includes('/api/auth'),
      undefined,
      { revalidate: true }
    );
  } else {
    mutate('/api/auth/me');
  }
}
```

### 📊 技術的詳細

#### デュアル書き込みシステムの構造
```typescript
const useRedis = !!REDIS_URL;
const useNeon = !!DATABASE_URL;
const useDualWrite = useRedis && useNeon;
const useMock = !DATABASE_URL && !REDIS_URL;
```

**動作フロー**:
1. **プライマリ**: Redis書き込み
2. **バックアップ**: PostgreSQL非同期書き込み
3. **フォールバック**: Redis障害時はPostgreSQLのみ

#### デバッグプロセス
1. **Vercel Function Logs**で実際のAPI実行を監視
2. **ブラウザNetworkタブ**でAPI呼び出しを確認
3. **Console.log**で段階的なデバッグ
4. **データベース更新結果**の直接確認

### ✅ 解決結果

#### 動作確認済み機能
- ✅ **名前変更**: リロード後も正しく保持される
- ✅ **メールアドレス変更**: 完全動作（重複チェック含む）
- ✅ **パスワード変更**: 現在のパスワード認証付きで動作
- ✅ **管理者による他ユーザープロフィール編集**: 完全動作
- ✅ **UI即座更新**: SWRキャッシュ無効化で即時反映

#### パフォーマンス
- **API応答時間**: 変更なし
- **UI応答性**: キャッシュ最適化により向上
- **データ整合性**: デュアル書き込みで高可用性

### 🚀 デプロイ履歴

**主要コミット**:
- `27d89f1`: 初期SWRキャッシュ修正
- `d69d9f3`: API検証ロジック修正
- `6600f8e`: メールアドレス検証統一
- `6ed9e4d`: デュアル書き込み層修正（根本解決）
- `d2ad5ae`: デバッグログクリーンアップ

**デプロイ先**:
- **本番環境**: Vercel自動デプロイ
- **データベース**: Neon PostgreSQL + Redis Cloud

### 📋 学習ポイント

#### 1. 複雑なシステムでのデバッグ手法
- **段階的切り分け**: フロントエンド → API → データベース
- **実環境でのテスト**: 開発環境では再現しない問題
- **詳細ログの重要性**: console.logによる動作確認

#### 2. デュアル書き込みシステムの注意点
- **処理漏れの発生リスク**: 片方のストレージのみ実装される
- **一貫性の確保**: 両方のストレージで同じ処理が必要
- **エラーハンドリング**: フォールバック機能の重要性

#### 3. Next.js + SWRでの状態管理
- **キャッシュ無効化のタイミング**: onSuccess時の適切な処理
- **楽観的更新**: ユーザー体験の向上
- **revalidateオプション**: false/trueの使い分け

### 🔧 今後の改善提案

#### 1. 監視・ログ強化
```typescript
// 本番環境用の構造化ログ
logger.info('Profile updated', {
  userId,
  fields: Object.keys(updates),
  timestamp: new Date().toISOString()
});
```

#### 2. テスト追加
```typescript
// プロフィール更新の統合テスト
describe('Profile Update', () => {
  it('should persist name changes after reload', async () => {
    // テストロジック
  });
});
```

#### 3. エラー監視
- Sentry統合でプロダクションエラートラッキング
- デュアル書き込み失敗の監視とアラート

### 💡 セッション終了状態

**✅ 完全解決済み**:
- プロフィール更新機能の完全動作
- リロード後のデータ永続化
- 全フィールド（名前・メール・パスワード）対応

**🔒 セキュリティ**:
- 現在のパスワード認証必須（メール・パスワード変更時）
- JWT セッション管理
- 適切な入力検証

**⚡ パフォーマンス**:
- SWRキャッシュ最適化
- デュアル書き込みでの高可用性
- UI即座更新

**最終確認**: 全てのプロフィール更新機能が正常動作中（admin@example.com / password123でテスト済み）