# month-challenge

コミュニティ向けの日次スタンプ記録アプリ「月チャレ」。

本体は **[`auth-app/`](auth-app/)** にあります。開発する際はそちらのディレクトリで作業してください。

- 本番: https://month-challenge-auth.vercel.app/
- ドキュメント: [`auth-app/CLAUDE.md`](auth-app/CLAUDE.md) と [`auth-app/docs/`](auth-app/docs/)

## 経緯

もともとリポジトリ直下にログイン不要版（DailyPing）があり、後からログイン機能を追加するために `auth-app/` を別途作りました。2026-07-25 に旧システムの運用を終了し、Vercelプロジェクトごと削除したため、直下のソースコードも撤去しています。

旧システムのコードが必要になった場合は、Gitの履歴から取得できます。

```bash
git log --oneline -- app lib db   # 旧システムに触れたコミットを探す
git show <commit>:app/page.tsx    # 特定ファイルの内容を見る
```
