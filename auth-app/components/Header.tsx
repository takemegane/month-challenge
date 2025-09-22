"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
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

  if (isAuth || isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-orange-200/60">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center justify-between">
          <a href="/calendar" className="font-semibold tracking-tight text-2xl text-orange-800">月チャレ</a>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex gap-4 text-base sm:text-lg">
              <a href="/calendar" className="hover:text-orange-900 text-orange-700 transition font-medium">今月のカレンダー</a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

