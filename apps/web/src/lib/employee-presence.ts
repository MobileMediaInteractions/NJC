export const employeePresenceStatuses = ["online", "away", "dnd", "offline"] as const;
export type EmployeePresenceStatus = (typeof employeePresenceStatuses)[number];

export const employeePresencePlatforms = [
  "web",
  "ios",
  "android",
  "macos",
  "windows",
  "linux",
  "unknown",
] as const;
export type EmployeePresencePlatform = (typeof employeePresencePlatforms)[number];

export const PRESENCE_ACTIVE_WINDOW_MS = 90_000;

export interface EmployeePresenceRecord {
  userClerkId: string;
  status: string;
  platform: string;
  lastSeenAt: Date | string | null;
  typingChannelId?: string | null;
}

export interface ResolvedEmployeePresence {
  status: EmployeePresenceStatus;
  platform: EmployeePresencePlatform;
  lastSeenAt: Date | null;
}

export function resolveEmployeePresence(
  record: EmployeePresenceRecord | null | undefined,
  now = new Date(),
): ResolvedEmployeePresence {
  if (!record) return { status: "offline" as const, platform: "unknown" as const, lastSeenAt: null };
  if (!record.lastSeenAt) {
    const platform = employeePresencePlatforms.includes(record.platform as EmployeePresencePlatform) ? record.platform as EmployeePresencePlatform : "unknown";
    return { status: "offline" as const, platform, lastSeenAt: null };
  }
  const lastSeenAt = new Date(record.lastSeenAt);
  const fresh = Number.isFinite(lastSeenAt.getTime()) && now.getTime() - lastSeenAt.getTime() <= PRESENCE_ACTIVE_WINDOW_MS;
  const declared = employeePresenceStatuses.includes(record.status as EmployeePresenceStatus)
    ? (record.status as EmployeePresenceStatus)
    : "offline";
  const platform = employeePresencePlatforms.includes(record.platform as EmployeePresencePlatform)
    ? (record.platform as EmployeePresencePlatform)
    : "unknown";
  return {
    status: fresh && declared !== "offline" ? declared : "offline",
    platform,
    lastSeenAt: Number.isFinite(lastSeenAt.getTime()) ? lastSeenAt : null,
  };
}

export function detectBrowserPresencePlatform(userAgent: string): EmployeePresencePlatform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/macintosh|mac os x/i.test(userAgent)) return "macos";
  if (/windows/i.test(userAgent)) return "windows";
  if (/linux/i.test(userAgent)) return "linux";
  return "web";
}

export function formatPresenceLastSeen(value: Date | string | null, now = new Date()) {
  if (!value) return "Never online";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Last seen unavailable";
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < 60_000) return "Active just now";
  if (elapsed < 3_600_000) return `Last online ${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `Last online ${Math.floor(elapsed / 3_600_000)}h ago`;
  return `Last online ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date)}`;
}
