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
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-orange-200/70 bg-white/90 shadow-xl shadow-orange-900/10">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-orange-900">新規登録</h1>
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm text-orange-900/80">メールアドレス</label>
              <input className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-orange-900/80">表示名（ユーザー名）</label>
              <input className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="山田太郎" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-orange-900/80">パスワード</label>
              <input className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="8文字以上" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <button className="btn-primary rounded px-4 py-2 w-full">登録</button>
          </form>
          {msg && <div className="mt-3 text-sm text-orange-900/80">{msg}</div>}
          <div className="mt-4 text-sm text-orange-900/80">すでにアカウントあり？ <Link href={"/auth/sign-in" as Route} className="text-orange-700 underline">ログイン</Link></div>
        </div>
      </div>
    </div>
  );
}
