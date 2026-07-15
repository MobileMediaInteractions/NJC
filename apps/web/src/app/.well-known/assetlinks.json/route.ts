import { NextResponse } from "next/server";

export function GET() {
  const packageName = process.env.EMPLOYEE_ANDROID_PACKAGE;
  const fingerprints = process.env.EMPLOYEE_ANDROID_SHA256_CERT_FINGERPRINTS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const data = packageName && fingerprints.length ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints } }] : [];
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "application/json" } });
}
