export type StoryStatus =
  | "idea"
  | "assigned"
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

export type ResolvedTheme = "light" | "dark";
export type ThemePreference = "system" | ResolvedTheme;

export function oppositeTheme(systemTheme: ResolvedTheme): ResolvedTheme {
  return systemTheme === "dark" ? "light" : "dark";
}

/**
 * An explicit preference that matches the device is visually identical to
 * System, so collapse it to System and keep only the useful override.
 */
export function normalizeThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ThemePreference {
  return preference === systemTheme ? "system" : preference;
}

export function adaptiveThemePreferences(
  systemTheme: ResolvedTheme,
): readonly ["system", ResolvedTheme] {
  return ["system", oppositeTheme(systemTheme)];
}

export function nextAdaptiveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ThemePreference {
  return normalizeThemePreference(preference, systemTheme) === "system"
    ? oppositeTheme(systemTheme)
    : "system";
}

export type StaffRole =
  | "admin"
  | "editor"
  | "producer"
  | "reporter"
  | "contributor";

export interface Author {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatar?: string;
}

export interface Story {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string[];
  category: string;
  categoryLabel: string;
  location: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  image: string;
  imageAlt: string;
  author: Author;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  status: StoryStatus;
  isBreaking?: boolean;
  isLive?: boolean;
  isExclusive?: boolean;
  isDeveloping?: boolean;
  videoUrl?: string;
}

export interface WeatherSnapshot {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  high: number;
  low: number;
  wind: string;
  humidity: number;
  alert?: string;
  hourly: Array<{ time: string; temperature: number; condition: string }>;
  daily?: Array<{
    name: string;
    temperature: number;
    temperatureUnit: string;
    condition: string;
  }>;
  observedAt?: string;
  source?: string;
}

export interface PublicConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  region: string;
  city: string;
  state: string;
  station: string;
  timezone: string;
  navigation: ReadonlyArray<{ label: string; href: string }>;
  live: { enabled: boolean; label: string; streamUrl: string };
  features: {
    comments: boolean;
    newsletters: boolean;
    alerts: boolean;
    liveVideo: boolean;
    weather: boolean;
  };
}

export interface LiveSnapshot {
  isLive: boolean;
  title: string;
  streamUrl: string | null;
  schedule: Array<{ startsAt: string; title: string }>;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown> & { apiVersion: string };
}

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

export const developerScopes = [
  "news:read",
  "weather:read",
  "live:read",
] as const;

export type DeveloperScope = (typeof developerScopes)[number];

export const audiencePlatforms = [
  "web",
  "ios",
  "android",
  "tvos",
  "androidtv",
  "roku",
  "api",
] as const;

export type AudiencePlatform = (typeof audiencePlatforms)[number];

export interface AudiencePlatformMetric {
  platform: AudiencePlatform;
  label: string;
  measurement: "installations" | "accounts";
  allTime: number;
  active24h: number;
  active7d: number;
  active30d: number;
  knownAccounts: number;
}

export interface AudienceSummary {
  platforms: AudiencePlatformMetric[];
  totals: {
    trackedInstallations: number;
    active24h: number;
    active7d: number;
    active30d: number;
    knownAccountLinks: number;
    apiConsumers: number;
  };
  generatedAt: string;
  database: "connected" | "not configured";
}

export const mobileApiVersion = "1" as const;

export const pairingTargets = ["tv", "androidtv", "roku", "web"] as const;
export type PairingTarget = (typeof pairingTargets)[number];

export interface PairingRequest {
  id: string;
  target: PairingTarget;
  deviceSecret: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  qrImageUrl: string;
  expiresAt: string;
  pollIntervalSeconds: number;
}

export type PairingPollResult =
  | { status: "pending"; expiresAt: string }
  | { status: "approved"; accessToken: string; account: { name: string; platform: "tvos" | "androidtv" | "roku" }; expiresAt: string }
  | { status: "approved"; ticket: string; expiresAt: string }
  | { status: "expired" | "consumed" | "denied" };

/**
 * Privileged capabilities are intentionally narrower than newsroom roles. The
 * API remains the authority; clients use this list only to shape navigation.
 */
export const employeeCapabilities = [
  "employee:access",
  "chat:read",
  "chat:write",
  "chat:manage",
  "chat:moderate",
  "tools:metrics",
  "tools:editorial",
  "tools:alerts",
  "tools:live",
  "access:review",
  "platform:license-admin",
] as const;

export type EmployeeCapability = (typeof employeeCapabilities)[number];

export const employeeAccessRequestStatuses = [
  "pending",
  "approved",
  "denied",
  "cancelled",
  "expired",
  "revoked",
] as const;

export type EmployeeAccessRequestStatus =
  (typeof employeeAccessRequestStatuses)[number];

export const employeeChannelKinds = [
  "public",
  "private",
  "direct",
  "group",
] as const;

export type EmployeeChannelKind = (typeof employeeChannelKinds)[number];

export interface EmployeeEligibility {
  authenticated: boolean;
  eligible: boolean;
  capabilities: EmployeeCapability[];
  role?: StaffRole;
  minimumVersion: string;
  install: {
    ios: string | null;
    android: string | null;
    internal: string | null;
  };
}

export const employeeLinkVersion = 1 as const;
export type EmployeeToolDestination =
  | "metrics"
  | "editorial"
  | "alerts"
  | "live"
  | "licensing";

export type EmployeeDestination =
  | { kind: "dashboard" }
  | { kind: "notifications" }
  | { kind: "access-request"; capability?: EmployeeCapability }
  | { kind: "tool"; tool: EmployeeToolDestination }
  | { kind: "channel"; channelId: string };

export interface EmployeeDeepLink {
  version: typeof employeeLinkVersion;
  destination: EmployeeDestination;
  returnTo?: string;
}

const employeeUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const employeeTools = ["metrics", "editorial", "alerts", "live", "licensing"] as const;

export function buildEmployeeDeepLink(
  link: EmployeeDeepLink,
  base = "njcourier-employee://",
) {
  let path: string;
  switch (link.destination.kind) {
    case "dashboard":
      path = "dashboard";
      break;
    case "notifications":
      path = "notifications";
      break;
    case "access-request":
      path = "access-request";
      break;
    case "tool":
      path = `tools/${link.destination.tool}`;
      break;
    case "channel":
      path = `chat/channel/${link.destination.channelId}`;
      break;
  }
  const url = new URL(`v${link.version}/${path}`, base.endsWith("/") ? base : `${base}/`);
  if (link.destination.kind === "access-request" && link.destination.capability)
    url.searchParams.set("capability", link.destination.capability);
  if (link.returnTo) url.searchParams.set("returnTo", link.returnTo);
  return url.toString();
}

export function parseEmployeeDeepLink(input: string): EmployeeDeepLink | null {
  try {
    const url = new URL(input);
    const parts = [url.hostname, ...url.pathname.split("/")]
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));
    const employeeIndex = parts.indexOf("employee-link");
    const path = employeeIndex >= 0 ? parts.slice(employeeIndex + 1) : parts;
    if (path.shift() !== `v${employeeLinkVersion}`) return null;

    let destination: EmployeeDestination;
    if (path.length === 1 && path[0] === "dashboard") {
      destination = { kind: "dashboard" };
    } else if (path.length === 1 && path[0] === "notifications") {
      destination = { kind: "notifications" };
    } else if (path.length === 1 && path[0] === "access-request") {
      const requested = url.searchParams.get("capability");
      const capability = employeeCapabilities.find((item) => item === requested);
      destination = { kind: "access-request", ...(capability ? { capability } : {}) };
    } else if (
      path.length === 2 &&
      path[0] === "tools" &&
      employeeTools.includes(path[1] as EmployeeToolDestination)
    ) {
      destination = { kind: "tool", tool: path[1] as EmployeeToolDestination };
    } else if (
      path.length === 3 &&
      path[0] === "chat" &&
      path[1] === "channel" &&
      employeeUuidPattern.test(path[2])
    ) {
      destination = { kind: "channel", channelId: path[2] };
    } else {
      return null;
    }

    const returnTo = url.searchParams.get("returnTo");
    return {
      version: employeeLinkVersion,
      destination,
      ...(returnTo && returnTo.length <= 500 ? { returnTo } : {}),
    };
  } catch {
    return null;
  }
}
