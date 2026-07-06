import { NextRequest, NextResponse } from "next/server";
import { getIcon } from "../../../../lib/icon-storage";
import { withNoStore } from "../../../../lib/http-cache";

export async function GET(request: NextRequest) {
  try {
    const iconData = await getIcon('192');
    if (iconData) {
      const buffer = Buffer.from(iconData, 'base64');
      return new NextResponse(buffer, {
        headers: withNoStore({
          'Content-Type': 'image/png',
        }),
      });
    }

    // Fallback to default icon
    const defaultIconUrl = `https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg`;
    const response = await fetch(defaultIconUrl);

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: withNoStore({
          'Content-Type': response.headers.get('content-type') || 'image/svg+xml',
        }),
      });
    }

    // Ultimate fallback
    return NextResponse.json({ error: "icon_not_found" }, { status: 404 });

  } catch (error) {
    console.error("Icon serving error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}