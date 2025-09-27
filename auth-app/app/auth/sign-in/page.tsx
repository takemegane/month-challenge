"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string>("");
  const [iconLoading, setIconLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load current icon
    console.log("Loading current icon...");
    fetch("/api/icon/current")
      .then(res => {
        console.log("Icon API response status:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("Icon API response data:", data);
        if (data.iconUrl) {
          console.log("Setting icon URL to:", data.iconUrl);
          setIconUrl(data.iconUrl);
        } else {
          // Use default icon if no custom icon
          setIconUrl("https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg");
        }
        setIconLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load current icon:", error);
        // Use default icon on error
        setIconUrl("https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg");
        setIconLoading(false);
      });
  }, []);
  
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    // 入力値の検証
    if (!email.trim()) {
      setMsg("メールアドレスを入力してください");
      return;
    }
    if (!password.trim()) {
      setMsg("パスワードを入力してください");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password })
      });
      const j = await res.json().catch(()=>null);
      if (res.ok) {
        // Cookie設定を確実にするため少し待ってからリダイレクト
        setTimeout(() => {
          location.href = "/calendar";
        }, 100);
      } else {
        if (res.status === 401) {
          setMsg("メールアドレスまたはパスワードが間違っています");
        } else if (res.status === 400) {
          setMsg("入力内容を確認してください");
        } else {
          setMsg(`ログインに失敗しました (エラーコード: ${res.status})`);
        }
      }
    } catch (error) {
      setMsg("ネットワークエラーが発生しました");
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#27272a', marginBottom: '1rem' }}>月チャレ</h1>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            {iconLoading ? (
              // Show animated loading placeholder
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.1) 25%, rgba(245, 158, 11, 0.2) 50%, rgba(245, 158, 11, 0.1) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                <style>
                  {`
                    @keyframes shimmer {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                  `}
                </style>
                📱
              </div>
            ) : (
              // Show actual icon after loading
              <img
                src={iconUrl}
                alt="月チャレアイコン"
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }}
                onError={(e) => {
                  console.log("Icon load failed, falling back to default");
                  const target = e.target as HTMLImageElement;
                  target.src = "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg";
                }}
              />
            )}
          </div>
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
                placeholder="パスワード"
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
              ログイン
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
              まだアカウントをお持ちでない場合
            </p>
            <Link
              href={"/auth/sign-up" as Route}
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
              新規登録
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}