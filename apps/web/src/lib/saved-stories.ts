import type { Story } from "@harborline/contracts";

export const SAVED_STORIES_STORAGE_KEY = "njc:saved-story-urls";
export const SAVED_STORIES_CHANGE_EVENT = "njc:saved-stories-change";
export const MAX_LOCAL_SAVED_STORIES = 50;

const storySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export type SavedStorySummary = Pick<
  Story,
  | "categoryLabel"
  | "dek"
  | "headline"
  | "id"
  | "image"
  | "imageAlt"
  | "publishedAt"
  | "readingMinutes"
  | "slug"
>;

export function normalizeSavedStoryPath(value: string, origin: string) {
  try {
    const expectedOrigin = new URL(origin).origin;
    const url = new URL(value, expectedOrigin);
    if (url.origin !== expectedOrigin) return null;
    const match = /^\/story\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]!);
    if (slug.length > 180 || !storySlugPattern.test(slug)) return null;
    return `/story/${slug}`;
  } catch {
    return null;
  }
}

export function readSavedStoryPaths(storage: StorageReader, origin: string) {
  const raw = storage.getItem(SAVED_STORIES_STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const unique = new Set<string>();
  for (const value of parsed) {
    if (typeof value !== "string") continue;
    const path = normalizeSavedStoryPath(value, origin);
    if (path) unique.add(path);
  }
  return [...unique].slice(-MAX_LOCAL_SAVED_STORIES);
}

export function writeSavedStoryPaths(storage: StorageWriter, paths: string[], origin: string) {
  const normalized = paths
    .map((path) => normalizeSavedStoryPath(path, origin))
    .filter((path): path is string => Boolean(path));
  const bounded = [...new Set(normalized)].slice(-MAX_LOCAL_SAVED_STORIES);
  storage.setItem(SAVED_STORIES_STORAGE_KEY, JSON.stringify(bounded));
  return bounded;
}

export function savedStorySlug(path: string) {
  const match = /^\/story\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  return match?.[1] ?? null;
}

export function parseSavedStorySummary(value: unknown): SavedStorySummary | null {
  if (!value || typeof value !== "object") return null;
  const story = value as Record<string, unknown>;
  if (
    typeof story.id !== "string"
    || typeof story.slug !== "string"
    || !storySlugPattern.test(story.slug)
    || typeof story.headline !== "string"
    || typeof story.dek !== "string"
    || typeof story.categoryLabel !== "string"
    || typeof story.image !== "string"
    || typeof story.imageAlt !== "string"
    || typeof story.publishedAt !== "string"
    || typeof story.readingMinutes !== "number"
    || !Number.isFinite(story.readingMinutes)
  ) {
    return null;
  }
  return story as SavedStorySummary;
}
