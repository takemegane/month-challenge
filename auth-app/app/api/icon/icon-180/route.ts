import { NextRequest, NextResponse } from "next/server";
import { getIcon } from "../../../../lib/icon-storage";
import { withNoStore } from "../../../../lib/http-cache";

export async function GET(request: NextRequest) {
  try {
    // First check if uploaded icon exists in file system (fastest option)
    const fs = require('fs');
    const path = require('path');
    const uploadedIconPath = path.join(process.cwd(), "public", "icons", "icon-180.png");

    if (fs.existsSync(uploadedIconPath)) {
      console.log("Serving icon-180 from filesystem");
      const buffer = fs.readFileSync(uploadedIconPath);
      return new NextResponse(buffer, {
        headers: withNoStore({
          'Content-Type': 'image/png',
        }),
      });
    }

    // Then check persistent storage
    const iconData = await getIcon('180');
    if (iconData) {
      console.log("Serving icon-180 from persistent storage");
      const buffer = Buffer.from(iconData, 'base64');

      // Use cache-busting headers for custom icons to prevent display issues
      return new NextResponse(buffer, {
        headers: withNoStore({
          'Content-Type': 'image/png',
        }),
      });
    }

    // Fallback to default icon (use 192 as fallback since 180 might not exist)
    console.log("Serving icon-180 from default URL fallback");
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

    // Ultimate fallback
    return NextResponse.json({ error: "icon_not_found" }, { status: 404 });

  } catch (error) {
    console.error("Icon serving error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}