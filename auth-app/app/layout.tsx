import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "月チャレ",
  description: "コミュニティ日次投稿トラッカー（メールログイン版）",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} min-h-screen antialiased bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(34,197,94,0.18),transparent),linear-gradient(180deg,#f0fdf4,#dcfce7)] text-zinc-800`}>
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-2xl border border-orange-200/70 bg-white/80 shadow-xl shadow-orange-900/10">
            <div className="p-5 sm:p-7">{children}</div>
          </div>
        </main>
      </body>
    </html>
  );
}
