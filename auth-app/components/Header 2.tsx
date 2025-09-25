"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  is_admin?: boolean;
}

export default function Header() {
  const pathname = usePathname() || "/";
  const isAuth = pathname.startsWith("/auth");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuth) {
      fetch("/api/auth/me", { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isAuth]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      // Redirect to login page after logout
      window.location.href = "/auth/sign-in";
    } catch (error) {
      // Silently handle logout errors - redirect regardless
      // Still redirect even if logout request fails
      window.location.href = "/auth/sign-in";
    }
  };

  if (isAuth || isLoading) {
    return null;
  }

  if (!user) {
    // ユーザー情報が取得できない場合は強制ログアウト
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800">
        セッションが無効です。
        <button
          onClick={() => window.location.href = "/auth/sign-in"}
          className="ml-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded border"
        >
          ログインページへ
        </button>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-orange-200/60">
      <div className="mx-auto max-w-4xl px-4 py-3">
        {/* Desktop layout */}
        <div className="hidden sm:flex items-center justify-between">
          <a href="/calendar" className="font-semibold tracking-tight text-2xl text-orange-800">月チャレ</a>
          <div className="flex items-center gap-4">
            <nav className="flex flex-wrap gap-3">
              <a
                href="/calendar"
                className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium rounded-lg transition border border-orange-200 hover:border-orange-300 text-base"
              >
                今月のカレンダー
              </a>
              <a
                href="/list"
                className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium rounded-lg transition border border-orange-200 hover:border-orange-300 text-base"
              >
                一覧
              </a>
              {user.is_admin && (
                <>
                  <a
                    href="/admin"
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition border border-purple-200 hover:border-purple-300 text-base"
                  >
                    ユーザー設定
                  </a>
                  <a
                    href="/admin/overview"
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition border border-purple-200 hover-border-purple-300 text-base"
                  >
                    チェック管理
                  </a>
                </>
              )}
            </nav>
            <div className="flex items-center gap-2 text-base">
              <a
                href="/account"
                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-900 font-semibold rounded-lg transition border border-orange-200 hover:border-orange-300"
              >
                {user.name}
              </a>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded transition border border-red-200 hover:border-red-300 text-sm"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="sm:hidden space-y-3">
          {/* Top row: Title and user info */}
          <div className="flex items-center justify-between">
            <a href="/calendar" className="font-semibold tracking-tight text-xl text-orange-800">月チャレ</a>
            <div className="flex items-center gap-2 text-sm">
              <a
                href="/account"
                className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 font-semibold rounded-lg transition border border-orange-200 hover:border-orange-300"
              >
                {user.name}
              </a>
              <button
                onClick={handleLogout}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded transition border border-red-200 hover:border-red-300 text-xs"
              >
                ログアウト
              </button>
            </div>
          </div>

          {/* Bottom row: Navigation buttons */}
          <nav className="grid grid-cols-2 gap-2">
            <a
              href="/calendar"
              className="flex-1 px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium rounded-lg transition border border-orange-200 hover:border-orange-300 text-center text-sm"
            >
              今月のカレンダー
            </a>
            <a
              href="/list"
              className="flex-1 px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium rounded-lg transition border border-orange-200 hover:border-orange-300 text-center text-sm"
            >
              一覧
            </a>
            {user.is_admin && (
              <>
                <a
                  href="/admin"
                  className="flex-1 px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition border border-purple-200 hover:border-purple-300 text-center text-sm"
                >
                  ユーザー設定
                </a>
                <a
                  href="/admin/overview"
                  className="flex-1 px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition border border-purple-200 hover-border-purple-300 text-center text-sm"
                >
                  チェック管理
                </a>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
