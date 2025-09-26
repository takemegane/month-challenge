import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    // Check if uploaded icon exists
    const uploadedIconPath = join(process.cwd(), "public", "icons", "icon-192.png");

    if (existsSync(uploadedIconPath)) {
      // Return local uploaded icon
      return NextResponse.json({
        iconUrl: "/icons/icon-192.png",
        type: "uploaded"
      });
    } else {
      // Return default GitHub Raw URL icon
      return NextResponse.json({
        iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
        type: "default"
      });
    }
  } catch (error) {
    console.error("Current icon API error:", error);
    // Fallback to default icon
    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    });
  }
}