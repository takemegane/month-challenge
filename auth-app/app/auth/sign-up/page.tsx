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
    if (res.ok) {
      location.href = "/auth/sign-in";
    } else {
      if (res.status === 409) {
        setMsg("このメールアドレスは既に登録されています");
      } else if (res.status === 400) {
        setMsg("入力内容を確認してください（パスワードは8文字以上）");
      } else {
        setMsg(`登録に失敗しました (エラーコード: ${res.status})`);
      }
    }
  }
  
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#27272a', marginBottom: '0rem' }}>月チャレ新規登録</h1>
        </div>
        
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          padding: '1.5rem'
        }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <input
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="メールアドレス"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
              />
            </div>

            <div>
              <input
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="表示名（ユーザー名）"
                type="text"
                value={name}
                onChange={e=>setName(e.target.value)}
              />
            </div>

            <div>
              <input
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="パスワード（8文字以上）"
                type="password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
              />
            </div>

            <button style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '0.75rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}>
              登録
            </button>
          </form>

          {msg && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              fontSize: '0.875rem',
              color: '#b91c1c',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.75rem',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              ⚠️ {msg}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              すでにアカウントをお持ちの場合
            </p>
            <Link
              href={"/auth/sign-in" as Route}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                color: '#f59e0b',
                fontWeight: '600',
                borderRadius: '0.75rem',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                textDecoration: 'none'
              }}
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}