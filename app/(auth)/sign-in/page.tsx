export default function SignInPage() {
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="card-title">ログイン不要になりました</h1>
      <p className="text-orange-900/80">管理者にユーザー名の作成を依頼し、画面上部のプルダウンから自分の名前を選択してください。</p>
      <a href="/calendar" className="text-orange-700 underline">カレンダーへ</a>
    </div>
  );
}
