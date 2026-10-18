export interface PublicCommunityBulletin {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  startsAt: Date | null;
  endsAt: Date | null;
  venue: string | null;
  city: string | null;
  organizer: string | null;
  externalUrl: string | null;
  isFeatured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
}

export function communityBulletinPath(slug: string) {
  return `/community/${encodeURIComponent(slug)}`;
}

export function isCommunitySlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]{0,179}$/.test(slug);
}

export function safeCommunityExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
