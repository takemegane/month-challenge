"use client";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, credentials: 'include', body: JSON.stringify({ email, password, name }) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) location.href = "/calendar"; else setMsg(j.error || "失敗しました");
  }
  return (
    <div className="card"><div className="card-body">
      <h1 style={{ fontWeight: 600, fontSize: 20 }}>新規登録</h1>
      <form onSubmit={onSubmit} className="mt-3" style={{ display: 'grid', gap: 8 }}>
        <input className="input" placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="表示名（ユーザー名）" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="パスワード" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn btn-primary">登録</button>
      </form>
      {msg && <div className="mt-2" style={{ color: '#b45309' }}>{msg}</div>}
      <div className="mt-3 text-sm">すでにアカウントあり？ <Link href={"/auth/sign-in" as Route} className="underline">ログイン</Link></div>
    </div></div>
  );
}
