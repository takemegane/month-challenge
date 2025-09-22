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
      <body 
        className={`${inter.variable} min-h-screen antialiased text-white overflow-x-hidden`}
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 131, 122, 0.3), transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(120, 219, 226, 0.2), transparent 50%),
            linear-gradient(135deg, #0f0c29 0%, #24243e 50%, #313154 100%)
          `
        }}
      >
        <Header />
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
