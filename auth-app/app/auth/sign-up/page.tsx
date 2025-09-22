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
          <h1 className="card-title text-orange-900">新規登録</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-orange-900/80">メールアドレス</label>
              <input 
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" 
                placeholder="you@example.com" 
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-orange-900/80">表示名（ユーザー名）</label>
              <input 
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" 
                placeholder="山田太郎" 
                value={name} 
                onChange={e=>setName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-orange-900/80">パスワード</label>
              <input 
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" 
                placeholder="8文字以上" 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
              />
            </div>
            <button 
              className="w-full mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent bg-amber-500 text-white shadow-lg hover:bg-amber-600 active:scale-[0.99]" 
              style={{
                background: '#f59e0b',
                boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.25)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
            >
              登録
            </button>
          </form>
          {msg && <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{msg}</div>}
          <div className="mt-6 text-center text-sm text-orange-900/80">
            すでにアカウントをお持ちの場合は{" "}
            <Link href={"/auth/sign-in" as Route} className="text-orange-700 underline hover:text-orange-800 font-medium">
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
