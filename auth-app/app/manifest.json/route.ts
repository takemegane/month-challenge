import { NextResponse } from "next/server";
import { hasIcons } from "../../lib/icon-storage";

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseManifest = {
    name: "月チャレ - 月間チャレンジトラッカー",
    short_name: "月チャレ",
    description: "コミュニティ日次投稿トラッカー（メールログイン版）",
    start_url: "/",
    display: "standalone",
    background_color: "#f0fdf4",
    theme_color: "#fb923c",
    orientation: "portrait-primary" as const,
    icons: [] as Array<{
      src: string;
      sizes: string;
      type: string;
      purpose: string;
    }>
  };

  // Check if we have uploaded icons
  if (await hasIcons()) {
    // Use uploaded icons
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    baseManifest.icons = iconSizes.map(size => ({
      src: `/api/icon/icon-${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "maskable any"
    }));
  } else {
    // Fallback to default GitHub icons
    baseManifest.icons = [
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-72.png.svg",
        sizes: "72x72",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-96.png.svg",
        sizes: "96x96",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-128.png.svg",
        sizes: "128x128",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-144.png.svg",
        sizes: "144x144",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-152.png.svg",
        sizes: "152x152",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-384.png.svg",
        sizes: "384x384",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable any"
      }
    ];
  }

  return NextResponse.json(baseManifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}