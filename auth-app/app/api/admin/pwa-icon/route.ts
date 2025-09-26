import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { verifyAuth } from "../../../../lib/auth";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success || !authResult.user?.is_admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("icon") as File;

    if (!file) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create icons directory if it doesn't exist
    const iconsDir = join(process.cwd(), "public", "icons");
    try {
      await mkdir(iconsDir, { recursive: true });
    } catch (error) {
      // Directory already exists, ignore
    }

    // Generate all icon sizes
    const generatedIcons = [];
    for (const size of ICON_SIZES) {
      const filename = `icon-${size}.png`;
      const filepath = join(iconsDir, filename);

      // Resize and save image
      await sharp(buffer)
        .resize(size, size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(filepath);

      generatedIcons.push({
        src: `/icons/${filename}`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "maskable any"
      });
    }

    // Update manifest.json
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifest = {
      name: "月チャレ - 月間チャレンジトラッカー",
      short_name: "月チャレ",
      description: "コミュニティ日次投稿トラッカー（メールログイン版）",
      start_url: "/",
      display: "standalone",
      background_color: "#f0fdf4",
      theme_color: "#fb923c",
      orientation: "portrait-primary",
      icons: generatedIcons
    };

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return NextResponse.json({
      success: true,
      message: "PWAアイコンを更新しました",
      icons: generatedIcons
    });

  } catch (error) {
    console.error("PWA icon upload error:", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}