import "./globals.css";
import type { ReactNode } from "react";
import Header from "../components/Header";
import AuthLayout from "../components/AuthLayout";
import SWRProvider from "../components/SWRProvider";

export const metadata = {
  title: "月チャレ",
  description: "コミュニティ日次投稿トラッカー（メールログイン版）",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body
        className="font-sans antialiased text-zinc-800 min-h-screen"
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