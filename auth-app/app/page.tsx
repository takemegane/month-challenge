import Link from "next/link";

export default function Home() {
  return (
    <div className="card">
      <div className="card-body">
        <h1 style={{ fontWeight: 600, fontSize: 20 }}>メールログイン版</h1>
        <p className="mt-2">まずは登録/ログインしてください。</p>
        <div className="mt-3" style={{ display: 'flex', gap: 8 }}>
          <Link className="btn" href="/auth/sign-in">ログイン</Link>
          <Link className="btn btn-primary" href="/auth/sign-up">新規登録</Link>
        </div>
      </div>
    </div>
  );
}

