import { NextResponse } from "next/server";
import { z } from "zod";
import { parseEmployeeDeepLink, type EmployeeCapability } from "@harborline/contracts";
import { hasDatabase } from "@harborline/backend/db";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel } from "@/lib/employee-chat";

const input = z.object({ url: z.string().url().max(2000), appVersion: z.string().trim().max(50) });
const toolCapability: Record<string, EmployeeCapability> = {
  metrics: "tools:metrics",
  editorial: "tools:editorial",
  alerts: "tools:alerts",
  live: "tools:live",
  licensing: "platform:license-admin",
};

function versionParts(version: string) {
  return version.split(".").slice(0, 3).map((part) => Number(part.replace(/\D.*$/, "")) || 0);
}
function versionIsOlder(current: string, minimum: string) {
  const a = versionParts(current);
  const b = versionParts(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index];
  }
  return false;
}

export async function POST(request: Request) {
  const viewer = await getEmployeeViewer();
  if (!viewer) return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in to continue" } }, { status: 401 });
  const parsedInput = input.safeParse(await request.json().catch(() => null));
  const link = parsedInput.success ? parseEmployeeDeepLink(parsedInput.data.url) : null;
  if (!parsedInput.success || !link) return NextResponse.json({ error: { code: "invalid_link", message: "This employee link is invalid or unsupported" } }, { status: 400 });
  const minimum = process.env.EMPLOYEE_MIN_APP_VERSION ?? "1.0.0";
  if (versionIsOlder(parsedInput.data.appVersion, minimum)) return NextResponse.json({ error: { code: "upgrade_required", message: "Update the employee app to open this link", minimumVersion: minimum } }, { status: 426 });
  if (!viewer.capabilities.includes("employee:access")) return NextResponse.json({ error: { code: "forbidden", message: "Employee-app access is required", requestableCapability: "employee:access" } }, { status: 403 });

  const destination = link.destination;
  if (destination.kind === "tool" && !viewer.capabilities.includes(toolCapability[destination.tool])) return NextResponse.json({ error: { code: "forbidden", message: "This tool requires an additional capability", requestableCapability: toolCapability[destination.tool] } }, { status: 403 });
  if (destination.kind === "channel") {
    if (!hasDatabase() || !(await getAuthorizedEmployeeChannel(viewer, destination.channelId))) return NextResponse.json({ error: { code: "not_found", message: "This conversation is unavailable" } }, { status: 404 });
  }
  return NextResponse.json({ data: { link, route: destination.kind === "dashboard" ? "/" : destination.kind === "notifications" ? "/notifications" : destination.kind === "access-request" ? `/access-request${destination.capability ? `?capability=${encodeURIComponent(destination.capability)}` : ""}` : destination.kind === "tool" ? `/tools/${destination.tool}` : `/chat/${destination.channelId}` }, meta: { apiVersion: "1" } });
}
