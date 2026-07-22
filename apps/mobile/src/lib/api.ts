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
import { deviceStorage } from "@/lib/storage";

const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl;
export const apiBaseUrl = normalizeApiBaseUrl(
  typeof configuredUrl === "string" ? configuredUrl : "http://localhost:3000",
);
const cachePrefix = "harborline:api:";

async function cachedFetch<T>(
  path: string,
): Promise<T> {
  const key = `${cachePrefix}${path}`;
  let requestError: unknown;

  try {
    const data = await requestHarborlineApi<T>(path, { baseUrl: apiBaseUrl }, { headers: { "X-NJC-Client": "mobile" } });
    try {
      await deviceStorage.setItem(
        key,
        JSON.stringify({ savedAt: Date.now(), data }),
      );
    } catch {
      // A storage failure must not discard a successful network response.
    }
    return data;
  } catch (error) {
    requestError = error;
  }

  try {
    const cached = await deviceStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; data: T };
      if (typeof parsed.savedAt === "number" && "data" in parsed) {
        return parsed.data;
      }
    }
  } catch {
    // A corrupt or unavailable cache must not hide the original API failure.
  }

  throw requestError instanceof Error
    ? requestError
    : new Error("The NJ Courier service is unavailable.");
}

export function getStories(query = "") {
  const path = query ? `/api/v1/stories?${query}` : "/api/v1/stories?limit=40";
  return cachedFetch<Story[]>(path);
}

export function getStory(slug: string) {
  return cachedFetch<Story | null>(
    `/api/v1/stories/${encodeURIComponent(slug)}`,
  );
}

export function getWeather() {
  return cachedFetch<WeatherSnapshot>("/api/v1/weather");
}

export function getConfig() {
  return cachedFetch<PublicConfig | null>("/api/v1/config");
}

export function getLive() {
  return cachedFetch<LiveSnapshot>("/api/v1/live");
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
