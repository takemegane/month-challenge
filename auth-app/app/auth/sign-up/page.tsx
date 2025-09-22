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
    e.preventDefault(); 
    setMsg(null);
    const res = await fetch("/api/auth/register", { 
      method: "POST", 
      headers: { "content-type": "application/json" }, 
      credentials: 'include', 
      body: JSON.stringify({ email, password, name }) 
    });
    const j = await res.json().catch(()=>({}));
    if (res.ok) location.href = "/calendar"; 
    else setMsg(j.error || "失敗しました");
  }
  
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="relative">
          {/* Modern card with glassmorphism effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-3xl"></div>
          <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent mb-2">
                  新規登録
                </h1>
                <p className="text-gray-600 text-sm">アカウントを作成してください</p>
              </div>
              
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Modern floating label inputs */}
                <div className="relative">
                  <input 
                    className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-400 transition-all duration-300 placeholder-transparent bg-gray-50/50 text-lg" 
                    placeholder="you@example.com"
                    type="email"
                    id="email"
                    value={email} 
                    onChange={e=>setEmail(e.target.value)} 
                  />
                  <label 
                    htmlFor="email"
                    className="absolute left-4 -top-2 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-lg peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-sm peer-focus:text-orange-600 peer-focus:bg-white"
                  >
                    メールアドレス
                  </label>
                </div>
                
                <div className="relative">
                  <input 
                    className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-400 transition-all duration-300 placeholder-transparent bg-gray-50/50 text-lg" 
                    placeholder="山田太郎"
                    type="text"
                    id="name"
                    value={name} 
                    onChange={e=>setName(e.target.value)} 
                  />
                  <label 
                    htmlFor="name"
                    className="absolute left-4 -top-2 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-lg peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-sm peer-focus:text-orange-600 peer-focus:bg-white"
                  >
                    表示名（ユーザー名）
                  </label>
                </div>
                
                <div className="relative">
                  <input 
                    className="peer w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-400 transition-all duration-300 placeholder-transparent bg-gray-50/50 text-lg" 
                    placeholder="8文字以上"
                    type="password"
                    id="password"
                    value={password} 
                    onChange={e=>setPassword(e.target.value)} 
                  />
                  <label 
                    htmlFor="password"
                    className="absolute left-4 -top-2 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:text-lg peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-sm peer-focus:text-orange-600 peer-focus:bg-white"
                  >
                    パスワード
                  </label>
                </div>
                
                {/* Modern gradient button with enhanced touch target */}
                <button 
                  className="w-full py-4 mt-8 text-lg font-semibold text-white rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" 
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  登録
                </button>
              </form>
              
              {msg && (
                <div className="mt-6 p-4 text-sm text-red-700 bg-red-50/80 border border-red-200 rounded-2xl backdrop-blur-sm">
                  {msg}
                </div>
              )}
              
              <div className="mt-8 text-center">
                <p className="text-gray-600 text-sm">
                  すでにアカウントをお持ちの場合
                </p>
                <Link 
                  href={"/auth/sign-in" as Route} 
                  className="inline-block mt-2 px-6 py-2 text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-all duration-300 hover:scale-105"
                >
                  ログイン
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}