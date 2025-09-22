import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "月チャレ",
  description: "コミュニティ日次投稿トラッカー（メールログイン版）",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} min-h-screen antialiased bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(34,197,94,0.18),transparent),linear-gradient(180deg,#f0fdf4,#dcfce7)] text-zinc-800`}>
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
            {/* Mobile nav */}
            <nav className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
              <a
                href="/calendar"
                className="tap-target w-full text-center rounded-md border border-orange-300 bg-white px-3 py-2 text-base font-medium text-orange-800 shadow-sm hover:bg-orange-50 active:scale-[0.99]"
              >
                今月のカレンダー
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-2xl border border-orange-200/70 bg-white/80 shadow-xl shadow-orange-900/10">
            <div className="p-5 sm:p-7">{children}</div>
          </div>
        </main>
      </body>
    </html>
  );
}
