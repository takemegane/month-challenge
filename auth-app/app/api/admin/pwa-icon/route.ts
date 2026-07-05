import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import sharp from "sharp";
import { setIcon } from "../../../../lib/icon-storage";

const ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("icon") as File;

    if (!file) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const generatedIcons = [];

    for (const size of ICON_SIZES) {
      try {
        const processedBuffer = await sharp(buffer)
          .resize(size, size, {
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer();

        await setIcon(size.toString(), processedBuffer.toString('base64'));

        generatedIcons.push({
          src: `/api/icon/icon-${size}`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "maskable any"
        });
      } catch (sharpError) {
        return NextResponse.json({ error: `icon_generation_failed_${size}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "アイコンを更新しました",
      icons: generatedIcons,
      iconCount: generatedIcons.length
    });

  } catch (error) {
    console.error("PWA icon upload error:", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
