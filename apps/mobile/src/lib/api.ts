import Constants from 'expo-constants';
import type { ApiEnvelope, LiveSnapshot, PublicConfig, Story, WeatherSnapshot } from '@harborline/contracts';
import { mobileSeedStories, mobileSeedWeather } from '@/lib/mobile-seed';
import { deviceStorage } from '@/lib/storage';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl;
export const apiBaseUrl = typeof configuredUrl === 'string' ? configuredUrl.replace(/\/$/, '') : 'http://localhost:3000';
const cachePrefix = 'harborline:api:';

async function cachedFetch<T>(path: string, fallback: T, maxAgeMs = 15 * 60_000): Promise<T> {
  const key = `${cachePrefix}${path}`;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const payload = (await response.json()) as ApiEnvelope<T>;
    await deviceStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: payload.data }));
    return payload.data;
  } catch {
    const cached = await deviceStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; data: T };
      if (Date.now() - parsed.savedAt <= maxAgeMs * 24) return parsed.data;
    }
    return fallback;
  }
}

export function getStories(query = '') {
  const path = query ? `/api/v1/stories?${query}` : '/api/v1/stories?limit=40';
  return cachedFetch<Story[]>(path, mobileSeedStories, 10 * 60_000);
}

export async function getStory(slug: string) {
  const local = mobileSeedStories.find((story) => story.slug === slug) ?? null;
  return cachedFetch<Story | null>(`/api/v1/stories/${encodeURIComponent(slug)}`, local, 60 * 60_000);
}

export function getWeather() {
  return cachedFetch<WeatherSnapshot>('/api/v1/weather', mobileSeedWeather, 15 * 60_000);
}

export function getConfig() {
  return cachedFetch<PublicConfig | null>('/api/v1/config', null, 60 * 60_000);
}

export function getLive() {
  return cachedFetch<LiveSnapshot>('/api/v1/live', {
    isLive: false, title: 'Harborline Now', streamUrl: null,
    schedule: [{ startsAt: '18:00', title: 'Harborline at Six' }],
  }, 2 * 60_000);
}

export async function authenticatedRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  return payload.data as T;
}
