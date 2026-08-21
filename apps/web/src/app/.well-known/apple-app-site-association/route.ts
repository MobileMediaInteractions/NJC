import { NextResponse } from "next/server";
import { buildAppleAppSiteAssociation } from "@/lib/mobile-associations";

export function GET() {
  return NextResponse.json(
    buildAppleAppSiteAssociation({
      readerAppId: process.env.READER_IOS_APP_ID,
      employeeAppId: process.env.EMPLOYEE_IOS_APP_ID,
    }),
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    },
  );
}
