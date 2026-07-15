import { buildEmployeeDeepLink, parseEmployeeDeepLink, type EmployeeDeepLink } from "@harborline/contracts";

export function employeeLink(link: EmployeeDeepLink, universalHost?: string | null) {
  return buildEmployeeDeepLink(link, universalHost ? `https://${universalHost}/employee-link/` : "njcourier-employee://");
}
export function routeForResolvedLink(url: string) {
  const link = parseEmployeeDeepLink(url);
  if (!link) return null;
  const destination = link.destination;
  if (destination.kind === "dashboard") return "/";
  if (destination.kind === "notifications") return "/notifications";
  if (destination.kind === "access-request") return `/access-request${destination.capability ? `?capability=${encodeURIComponent(destination.capability)}` : ""}`;
  if (destination.kind === "tool") return `/tools/${destination.tool}`;
  return `/chat/${destination.channelId}`;
}
