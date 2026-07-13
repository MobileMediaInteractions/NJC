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

export interface StudioUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}
