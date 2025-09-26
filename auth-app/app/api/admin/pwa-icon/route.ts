import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/admin-auth";
import sharp from "sharp";

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

    // Generate base64 encoded icons for different sizes and store in database
    const iconData: Record<string, string> = {};
    console.log("Starting icon generation for", ICON_SIZES.length, "sizes");

    for (const size of ICON_SIZES) {
      console.log(`Generating icon-${size}...`);

      try {
        // Resize image and convert to base64
        const processedBuffer = await sharp(buffer)
          .resize(size, size, {
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer();

        const base64 = processedBuffer.toString('base64');
        iconData[`icon-${size}`] = base64;
        console.log(`Successfully generated icon-${size} (${base64.length} chars)`);

      } catch (sharpError) {
        console.log(`Error generating icon-${size}:`, sharpError);
        return NextResponse.json({ error: `icon_generation_failed_${size}` }, { status: 500 });
      }
    }

    // For now, we'll use a simple storage approach
    // Store the icons in a format that can be retrieved later
    console.log("Icons processed successfully");

    // Instead of file storage, we'll return the data for dynamic manifest generation
    const generatedIcons = ICON_SIZES.map(size => ({
      src: `/api/icon/pwa-icon-${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "maskable any"
    }));

    // Store icons data in environment/memory for this session
    // Note: In production, this should use a proper storage solution
    (global as any).uploadedIcons = iconData;

    return NextResponse.json({
      success: true,
      message: "アイコンを更新しました",
      icons: generatedIcons,
      iconCount: Object.keys(iconData).length
    });

  } catch (error) {
    console.error("PWA icon upload error:", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}