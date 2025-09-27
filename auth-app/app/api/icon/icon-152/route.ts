import { NextRequest, NextResponse } from "next/server";
import { getIcon } from "../../../../lib/icon-storage";
import { withNoStore } from "../../../../lib/http-cache";

export async function GET(request: NextRequest) {
  try {
    // First check persistent storage
    const iconData = await getIcon('152');
    if (iconData) {
      const buffer = Buffer.from(iconData, 'base64');

      return new NextResponse(buffer, {
        headers: withNoStore({
          'Content-Type': 'image/png',
        }),
      });
    }

    // Fallback to default icon
    const defaultIconUrl = `https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-152.png.svg`;
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

    // Ultimate fallback
    return NextResponse.json({ error: "icon_not_found" }, { status: 404 });

  } catch (error) {
    console.error("Icon serving error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}