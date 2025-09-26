import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { getIcon, hasIcons } from "../../../../lib/icon-storage";

export async function GET(request: NextRequest) {
  try {
    // First check if uploaded icon exists in file system
    const uploadedIconPath = join(process.cwd(), "public", "icons", "icon-192.png");

    if (existsSync(uploadedIconPath)) {
      console.log("Using filesystem icon");
      return NextResponse.json({
        iconUrl: "/icons/icon-192.png",
        type: "uploaded-fs"
      });
    }

    // Check persistent storage
    if (hasIcons() && getIcon('192')) {
      console.log("Using persistent storage icon");
      return NextResponse.json({
        iconUrl: "/api/icon/pwa-icon-192",
        type: "uploaded-persistent"
      });
    }

    // Then check if we have uploaded icons in memory
    const uploadedIcons = (global as any).uploadedIcons;

    if (uploadedIcons && uploadedIcons['icon-192']) {
      console.log("Using memory icon");
      return NextResponse.json({
        iconUrl: "/api/icon/pwa-icon-192",
        type: "uploaded-memory"
      });
    }

    // Return default GitHub Raw URL icon
    console.log("Using default icon");
    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    });

  } catch (error) {
    console.error("Current icon API error:", error);
    // Fallback to default icon
    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    });
  }
}