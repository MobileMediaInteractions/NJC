import Constants from "expo-constants";
import {
  normalizeApiBaseUrl,
  requestHarborlineApi,
} from "@harborline/api-client";
import type {
  LiveSnapshot,
  PublicConfig,
  Story,
  WeatherSnapshot,
} from "@harborline/contracts";
import { mobileSeedStories, mobileSeedWeather } from "@/lib/mobile-seed";
import { deviceStorage } from "@/lib/storage";

const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl;
export const apiBaseUrl = normalizeApiBaseUrl(
  typeof configuredUrl === "string" ? configuredUrl : "http://localhost:3000",
);
const cachePrefix = "harborline:api:";

async function cachedFetch<T>(
  path: string,
  fallback: T,
  maxAgeMs = 15 * 60_000,
): Promise<T> {
  const key = `${cachePrefix}${path}`;
  try {
    const data = await requestHarborlineApi<T>(path, { baseUrl: apiBaseUrl });
    await deviceStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
    return data;
  } catch {
    const cached = await deviceStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; data: T };
      if (Date.now() - parsed.savedAt <= maxAgeMs * 24) return parsed.data;
    }
    return fallback;
  }
}

export function getStories(query = "") {
  const path = query ? `/api/v1/stories?${query}` : "/api/v1/stories?limit=40";
  return cachedFetch<Story[]>(path, mobileSeedStories, 10 * 60_000);
}

export async function getStory(slug: string) {
  const local = mobileSeedStories.find((story) => story.slug === slug) ?? null;
  return cachedFetch<Story | null>(
    `/api/v1/stories/${encodeURIComponent(slug)}`,
    local,
    60 * 60_000,
  );
}

export function getWeather() {
  return cachedFetch<WeatherSnapshot>(
    "/api/v1/weather",
    mobileSeedWeather,
    15 * 60_000,
  );
}

export function getConfig() {
  return cachedFetch<PublicConfig | null>("/api/v1/config", null, 60 * 60_000);
}

export function getLive() {
  return cachedFetch<LiveSnapshot>(
    "/api/v1/live",
    {
      isLive: false,
      title: "Courier Live",
      streamUrl: null,
      schedule: [{ startsAt: "18:00", title: "Middlesex Evening Briefing" }],
    },
    2 * 60_000,
  );
}

export function authenticatedRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
) {
  return requestHarborlineApi<T>(
    path,
    { baseUrl: apiBaseUrl },
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    },
  );
}
