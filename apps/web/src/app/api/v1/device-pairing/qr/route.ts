import QRCode from "qrcode";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("value") ?? "";
  if (!value || value.length > 500)
    return NextResponse.json(
      { error: { code: "invalid_request", message: "A QR value is required" } },
      { status: 400 },
    );
  const png = await QRCode.toBuffer(value, {
    type: "png",
    width: 520,
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#072F4D", light: "#FFFFFFFF" },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
