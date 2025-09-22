import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "月チャレ（メールログイン版）",
  description: "メール+パスワード版",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-zinc-800">
        <header className="border-b px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <a href="/" className="font-semibold text-xl">月チャレ（メール版）</a>
            <nav className="text-sm">
              <a href="/auth/sign-in" className="underline">ログイン</a>
            </nav>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

