import type { Story } from '@harborline/contracts';
import { deviceStorage } from '@/lib/storage';

const key = 'harborline:bookmarks:v1';

export async function getBookmarks(): Promise<Story[]> {
  const value = await deviceStorage.getItem(key);
  if (!value) return [];
  try { return JSON.parse(value) as Story[]; } catch { return []; }
}

export async function isBookmarked(slug: string) {
  return (await getBookmarks()).some((story) => story.slug === slug);
}

export async function toggleBookmark(story: Story) {
  const stories = await getBookmarks();
  const exists = stories.some((item) => item.slug === story.slug);
  const next = exists ? stories.filter((item) => item.slug !== story.slug) : [story, ...stories];
  await deviceStorage.setItem(key, JSON.stringify(next));
  return !exists;
}
