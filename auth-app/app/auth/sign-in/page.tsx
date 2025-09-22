"use client";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    setMsg(null);
    const res = await fetch("/api/auth/login", { 
      method: "POST", 
      headers: { "content-type": "application/json" }, 
      credentials: 'include', 
      body: JSON.stringify({ email, password }) 
    });
    const j = await res.json().catch(()=>({}));
    if (res.ok) location.href = "/calendar"; 
    else setMsg(j.error || "失敗しました");
  }
  
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-800 mb-8">月チャレログイン</h1>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <input 
                className="w-full px-6 py-5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-all duration-200 text-lg placeholder-gray-500 bg-white/90" 
                placeholder="メールアドレス"
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
              />
            </div>
            
            <div>
              <input 
                className="w-full px-6 py-5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-all duration-200 text-lg placeholder-gray-500 bg-white/90" 
                placeholder="パスワード"
                type="password"
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
              />
            </div>
            
            <button className="btn-primary w-full py-5 text-lg font-semibold rounded-xl">
              ログイン
            </button>
          </form>
          
          {msg && (
            <div className="mt-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {msg}
            </div>
          )}
          
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm mb-4">
              まだアカウントをお持ちでない場合
            </p>
            <Link 
              href={"/auth/sign-up" as Route}
              className="inline-block px-6 py-3 text-primary font-semibold rounded-xl border border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              新規登録
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}