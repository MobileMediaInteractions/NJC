import { NextResponse } from "next/server";

export function GET() {
  const appId = process.env.EMPLOYEE_IOS_APP_ID;
  return NextResponse.json({ applinks: { apps: [], details: appId ? [{ appID: appId, paths: ["/employee-link/*"] }] : [] } }, { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "application/json" } });
}
