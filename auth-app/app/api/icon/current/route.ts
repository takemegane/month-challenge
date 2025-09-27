import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { getIcon, hasIcons } from "../../../../lib/icon-storage";
import { withNoStore } from "../../../../lib/http-cache";

export async function GET(request: NextRequest) {
  try {
    // First check if uploaded icon exists in file system
    const uploadedIconPath = join(process.cwd(), "public", "icons", "icon-192.png");

    if (existsSync(uploadedIconPath)) {
      console.log("Using filesystem icon");
      return NextResponse.json({
        iconUrl: `/icons/icon-192.png?v=${Date.now()}`,
        type: "uploaded-fs"
      }, { headers: withNoStore() });
    }

    // Check persistent storage
    const hasStoredIcons = await hasIcons();
    const storedIcon = await getIcon('192');
    if (hasStoredIcons && storedIcon) {
      console.log("Using persistent storage icon");
      return NextResponse.json({
        iconUrl: `/api/icon/icon-192?v=${Date.now()}`,
        type: "uploaded-persistent"
      }, { headers: withNoStore() });
    }

    // Then check if we have uploaded icons in memory
    const uploadedIcons = (global as any).uploadedIcons;

    if (uploadedIcons && uploadedIcons['icon-192']) {
      console.log("Using memory icon");
      return NextResponse.json({
        iconUrl: `/api/icon/pwa-icon-192?v=${Date.now()}`,
        type: "uploaded-memory"
      }, { headers: withNoStore() });
    }

    // Return default GitHub Raw URL icon
    console.log("Using default icon");
    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    }, { headers: withNoStore() });

  } catch (error) {
    console.error("Current icon API error:", error);
    // Fallback to default icon
    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    }, { headers: withNoStore() });
  }
}