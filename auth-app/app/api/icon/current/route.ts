import { NextRequest, NextResponse } from "next/server";
import { getIcon, hasIcons } from "../../../../lib/icon-storage";
import { withNoStore } from "../../../../lib/http-cache";

export async function GET(request: NextRequest) {
  try {
    const hasStoredIcons = await hasIcons();
    const storedIcon = await getIcon('192');
    if (hasStoredIcons && storedIcon) {
      return NextResponse.json({
        iconUrl: `/api/icon/icon-192?v=${Date.now()}`,
        type: "uploaded-persistent"
      }, { headers: withNoStore() });
    }

    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    }, { headers: withNoStore() });

  } catch (error) {
    console.error("Current icon API error:", error);
    return NextResponse.json({
      iconUrl: "https://raw.githubusercontent.com/takemegane/month-challenge/main/public/icons/icon-192.svg",
      type: "default"
    }, { headers: withNoStore() });
  }
}
