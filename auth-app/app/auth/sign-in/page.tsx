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
    <div className="min-h-screen flex">
      {/* Left Side - Desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20"></div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <h1 className="text-6xl font-black mb-6 leading-tight">
              <span className="block bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Daily
              </span>
              <span className="block text-white/90">
                Progress
              </span>
            </h1>
            <p className="text-xl text-white/70 leading-relaxed max-w-md">
              あなたの成長を記録し、
              <br />
              継続の力で目標を達成しよう
            </p>
          </div>
          
          {/* Animated decorative elements */}
          <div className="absolute top-1/4 right-12 w-32 h-32 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-24 w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full opacity-30 blur-lg animate-bounce"></div>
        </div>
      </div>
      
      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile title */}
          <div className="lg:hidden text-center mb-12">
            <h1 className="text-4xl font-black mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Daily Progress
              </span>
            </h1>
            <p className="text-white/70">継続の力で目標達成</p>
          </div>
          
          {/* Modern card with neumorphism */}
          <div className="relative">
            <div 
              className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
              style={{
                boxShadow: `
                  0 8px 32px rgba(0, 0, 0, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1)
                `
              }}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">ログイン</h2>
                <p className="text-white/60">アカウントにアクセス</p>
              </div>
              
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Modern input fields */}
                <div className="space-y-6">
                  <div className="relative group">
                    <input 
                      className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300 text-lg group-hover:border-white/30" 
                      placeholder="メールアドレス"
                      type="email"
                      value={email} 
                      onChange={e=>setEmail(e.target.value)} 
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  
                  <div className="relative group">
                    <input 
                      className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300 text-lg group-hover:border-white/30" 
                      placeholder="パスワード"
                      type="password"
                      value={password} 
                      onChange={e=>setPassword(e.target.value)} 
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>
                
                {/* Modern gradient button */}
                <button 
                  className="w-full py-4 rounded-2xl text-lg font-semibold text-white relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
                    boxShadow: '0 10px 40px rgba(236, 72, 153, 0.3)'
                  }}
                >
                  <span className="relative z-10">ログイン</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </form>
              
              {msg && (
                <div className="mt-6 p-4 bg-red-500/20 border border-red-400/30 rounded-2xl backdrop-blur-sm">
                  <p className="text-red-200 text-sm">{msg}</p>
                </div>
              )}
              
              <div className="mt-8 text-center">
                <p className="text-white/60 text-sm mb-3">
                  まだアカウントをお持ちでない場合
                </p>
                <Link 
                  href={"/auth/sign-up" as Route}
                  className="inline-flex items-center px-6 py-3 text-cyan-400 hover:text-cyan-300 font-semibold rounded-xl border border-cyan-400/30 hover:border-cyan-300/50 backdrop-blur-sm hover:bg-cyan-400/10 transition-all duration-300"
                >
                  新規登録
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}