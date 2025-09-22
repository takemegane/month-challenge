"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) location.href = "/calendar"; else setMsg(j.error || "失敗しました");
  }
  return (
    <div className="card"><div className="card-body">
      <h1 style={{ fontWeight: 600, fontSize: 20 }}>ログイン</h1>
      <form onSubmit={onSubmit} className="mt-3" style={{ display: 'grid', gap: 8 }}>
        <input className="input" placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="パスワード" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn btn-primary">ログイン</button>
      </form>
      {msg && <div className="mt-2" style={{ color: '#b45309' }}>{msg}</div>}
      <div className="mt-3 text-sm">アカウントがない？ <Link href="/auth/sign-up" className="underline">新規登録</Link></div>
    </div></div>
  );
}

