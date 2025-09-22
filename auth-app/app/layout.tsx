import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Header from "../components/Header";
import AuthLayout from "../components/AuthLayout";

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
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
