import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Header from "../components/Header";
import AuthLayout from "../components/AuthLayout";
import SWRProvider from "../components/SWRProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "月チャレ",
  description: "コミュニティ日次投稿トラッカー（メールログイン版）",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} antialiased text-zinc-800 min-h-screen`}
        style={{
          margin: 0,
          padding: 0,
          background: `radial-gradient(1200px 600px at 50% -10%, rgba(34,197,94,0.18), transparent), linear-gradient(180deg, #f0fdf4, #dcfce7)`
        }}
      >
        <SWRProvider>
          <Header />
          <AuthLayout>{children}</AuthLayout>
        </SWRProvider>
      </body>
    </html>
  );
}
