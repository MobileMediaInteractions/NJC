export type StoryStatus =
  | "idea"
  | "assigned"
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

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

export const mobileApiVersion = "1" as const;
