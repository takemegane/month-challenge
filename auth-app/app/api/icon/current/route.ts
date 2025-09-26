import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check if we have uploaded icons in memory
    const uploadedIcons = (global as any).uploadedIcons;

    if (uploadedIcons && uploadedIcons['icon-192']) {
      // Return uploaded icon API endpoint
      return NextResponse.json({
        iconUrl: "/api/icon/pwa-icon-192",
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