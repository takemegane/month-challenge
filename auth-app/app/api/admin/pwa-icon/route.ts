import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { requireAdmin } from "../../../../lib/admin-auth";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  try {
    console.log("PWA icon upload started");
    const formData = await request.formData();
    const file = formData.get("icon") as File;

    console.log("File received:", file ? `${file.name} (${file.size} bytes)` : "No file");

    if (!file) {
      console.log("Error: No file provided");
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.log("Error: Invalid file type:", file.type);
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create icons directory if it doesn't exist
    const iconsDir = join(process.cwd(), "public", "icons");
    console.log("Creating icons directory:", iconsDir);
    try {
      await mkdir(iconsDir, { recursive: true });
      console.log("Icons directory created/confirmed");
    } catch (error) {
      console.log("Error creating directory:", error);
      return NextResponse.json({ error: "directory_creation_failed" }, { status: 500 });
    }

    // Generate all icon sizes
    const generatedIcons = [];
    console.log("Starting icon generation for", ICON_SIZES.length, "sizes");

    for (const size of ICON_SIZES) {
      const filename = `icon-${size}.png`;
      const filepath = join(iconsDir, filename);
      console.log(`Generating ${filename}...`);

      try {
        // Resize and save image
        await sharp(buffer)
          .resize(size, size, {
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(filepath);

        console.log(`Successfully created ${filename}`);

        generatedIcons.push({
          src: `/icons/${filename}`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "maskable any"
        });
      } catch (sharpError) {
        console.log(`Error generating ${filename}:`, sharpError);
        return NextResponse.json({ error: `icon_generation_failed_${size}` }, { status: 500 });
      }
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

    // Also update layout.tsx metadata to use local icons
    const layoutPath = join(process.cwd(), "app", "layout.tsx");
    const layoutContent = await readFile(layoutPath, "utf8");

    // Replace GitHub Raw URLs with local paths in layout.tsx
    const updatedLayoutContent = layoutContent
      .replace(
        /https:\/\/raw\.githubusercontent\.com\/takemegane\/month-challenge\/main\/public\/icons\/icon-72\.png\.svg/g,
        "/icons/icon-72.png"
      )
      .replace(
        /https:\/\/raw\.githubusercontent\.com\/takemegane\/month-challenge\/main\/public\/icons\/icon-96\.png\.svg/g,
        "/icons/icon-96.png"
      )
      .replace(
        /https:\/\/raw\.githubusercontent\.com\/takemegane\/month-challenge\/main\/public\/icons\/icon-128\.png\.svg/g,
        "/icons/icon-128.png"
      )
      .replace(
        /https:\/\/raw\.githubusercontent\.com\/takemegane\/month-challenge\/main\/public\/icons\/icon-152\.png\.svg/g,
        "/icons/icon-152.png"
      )
      .replace(
        /https:\/\/raw\.githubusercontent\.com\/takemegane\/month-challenge\/main\/public\/icons\/icon-192\.svg/g,
        "/icons/icon-192.png"
      )
      .replace(/image\/svg\+xml/g, "image/png");

    await writeFile(layoutPath, updatedLayoutContent);

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