import { NextResponse } from "next/server";
import { buildAndroidAssetLinks } from "@/lib/mobile-associations";

export function GET() {
  return NextResponse.json(
    buildAndroidAssetLinks({
      readerPackage: process.env.READER_ANDROID_PACKAGE,
      readerFingerprints: process.env.READER_ANDROID_SHA256_CERT_FINGERPRINTS,
      employeePackage: process.env.EMPLOYEE_ANDROID_PACKAGE,
      employeeFingerprints: process.env.EMPLOYEE_ANDROID_SHA256_CERT_FINGERPRINTS,
    }),
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    },
  );
}
