import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { setIcon } from "../../../../lib/icon-storage";

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

    // Try to write to file system (works in development, may fail in production)
    let useFileSystem = false;
    const iconsDir = join(process.cwd(), "public", "icons");

    try {
      await mkdir(iconsDir, { recursive: true });
      useFileSystem = true;
      console.log("Using file system storage");
    } catch (error) {
      console.log("File system not available, using memory storage");
    }

    const iconData: Record<string, string> = {};
    const generatedIcons = [];
    console.log("Starting icon generation for", ICON_SIZES.length, "sizes");

    for (const size of ICON_SIZES) {
      console.log(`Generating icon-${size}...`);

      try {
        // Resize image
        const processedBuffer = await sharp(buffer)
          .resize(size, size, {
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer();

        if (useFileSystem) {
          // Try to save to file system
          try {
            const filename = `icon-${size}.png`;
            const filepath = join(iconsDir, filename);
            await writeFile(filepath, processedBuffer);
            console.log(`Successfully saved ${filename} to file system`);

            generatedIcons.push({
              src: `/icons/${filename}`,
              sizes: `${size}x${size}`,
              type: "image/png",
              purpose: "maskable any"
            });
          } catch (writeError) {
            console.log(`Failed to write ${size} to file, falling back to memory`);
            useFileSystem = false;
          }
        }

        if (!useFileSystem) {
          // Store in persistent storage
          const base64 = processedBuffer.toString('base64');
          iconData[`icon-${size}`] = base64;
          await setIcon(size.toString(), base64);
          console.log(`Successfully stored icon-${size} in persistent storage (${base64.length} chars)`);

          generatedIcons.push({
            src: `/api/icon/pwa-icon-${size}`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "maskable any"
          });
        }

      } catch (sharpError) {
        console.log(`Error generating icon-${size}:`, sharpError);
        return NextResponse.json({ error: `icon_generation_failed_${size}` }, { status: 500 });
      }
    }

    // Update manifest.json if using file system
    if (useFileSystem && generatedIcons.length > 0) {
      try {
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
        console.log("Updated manifest.json");
      } catch (manifestError) {
        console.log("Failed to update manifest.json:", manifestError);
      }
    }

    // Store icons data in memory as backup (for immediate access)
    if (Object.keys(iconData).length > 0) {
      (global as any).uploadedIcons = iconData;
      console.log("Icons stored in memory as backup");
    }

    console.log("Icon upload completed successfully");

    return NextResponse.json({
      success: true,
      message: "アイコンを更新しました",
      storageType: useFileSystem ? "filesystem" : "memory",
      icons: generatedIcons,
      iconCount: generatedIcons.length
    });

  } catch (error) {
    console.error("PWA icon upload error:", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}