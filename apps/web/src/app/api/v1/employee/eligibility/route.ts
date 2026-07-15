import { NextResponse } from "next/server";
import { getEmployeeViewer } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getEmployeeViewer();
  const data = {
    authenticated: Boolean(viewer),
    eligible: Boolean(viewer?.capabilities.includes("employee:access")),
    capabilities: viewer?.capabilities ?? [],
    role: viewer?.role,
    minimumVersion: process.env.EMPLOYEE_MIN_APP_VERSION ?? "1.0.0",
    install: {
      ios: process.env.EMPLOYEE_IOS_INSTALL_URL ?? null,
      android: process.env.EMPLOYEE_ANDROID_INSTALL_URL ?? null,
      internal: process.env.EMPLOYEE_INTERNAL_INSTALL_URL ?? null,
    },
  };
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
