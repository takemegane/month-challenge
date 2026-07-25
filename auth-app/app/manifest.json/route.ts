import { NextResponse } from "next/server";
import { hasIcons } from "../../lib/icon-storage";

export const dynamic = 'force-dynamic'

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

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

  // 管理画面からアイコンがアップロードされていれば Neon 上のものを配信する
  if (await hasIcons()) {
    baseManifest.icons = ICON_SIZES.map(size => ({
      src: `/api/icon/icon-${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "maskable any"
    }));
  } else {
    // 未アップロード時は同梱の静的アイコンを使う。
    // 以前は GitHub の raw URL を指していたが、参照先の public/ を撤去した際に
    // 404 になった。外部依存をなくすため public/icons/ を直接参照する。
    baseManifest.icons = ICON_SIZES.map(size => ({
      src: `/icons/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "maskable any"
    }));
  }

  return NextResponse.json(baseManifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}