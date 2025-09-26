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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-72.png.svg", sizes: "72x72", type: "image/svg+xml" },
      { url: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-96.png.svg", sizes: "96x96", type: "image/svg+xml" },
      { url: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-128.png.svg", sizes: "128x128", type: "image/svg+xml" },
      { url: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [
      { url: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-152.png.svg", sizes: "152x152", type: "image/svg+xml" },
      { url: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "月チャレ",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "月チャレ",
    "application-name": "月チャレ",
    "msapplication-TileColor": "#fb923c",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#fb923c",
  },
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
