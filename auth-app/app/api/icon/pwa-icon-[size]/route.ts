import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const params = await context.params;
    const size = params?.size as string;

    // Check if we have uploaded icons in memory
    const uploadedIcons = (global as any).uploadedIcons;

    if (uploadedIcons && uploadedIcons[`icon-${size}`]) {
      const base64Data = uploadedIcons[`icon-${size}`];
      const buffer = Buffer.from(base64Data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Fallback to default icon
    const defaultIconUrl = `https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg`;
    const response = await fetch(defaultIconUrl);

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Ultimate fallback - return a simple generated icon
    return NextResponse.json({ error: "icon_not_found" }, { status: 404 });

  } catch (error) {
    console.error("Icon serving error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}