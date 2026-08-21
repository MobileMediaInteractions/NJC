import { z } from "zod";
import type { Story } from "@harborline/contracts";

export const publicSearchPageQuerySchema = z.string().trim().min(1).max(120);

export const publicSearchSuggestionQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(8).default(5),
});

export type PublicSearchSuggestionKind = "topic" | "person" | "story";

export interface PublicSearchSuggestion {
  id: string;
  kind: PublicSearchSuggestionKind;
  title: string;
  description: string;
  href: string;
}

export interface PublicSearchSuggestionGroups {
  topics: PublicSearchSuggestion[];
  people: PublicSearchSuggestion[];
  stories: PublicSearchSuggestion[];
}

type RankedSuggestion = PublicSearchSuggestion & {
  score: number;
  publishedAt: number;
};

const WORD_BOUNDARY = /[\s\-–—:;'"()[\]{}.,!?/\\]/;

function normalize(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export function publicSearchLikePattern(value: string) {
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
  return `%${escaped}%`;
}

function matchScore(value: string, query: string) {
  const normalized = normalize(value);
  if (!normalized.includes(query)) return 0;
  if (normalized === query) return 100;
  if (normalized.startsWith(query)) return 80;
  const index = normalized.indexOf(query);
  if (index > 0 && WORD_BOUNDARY.test(normalized[index - 1] ?? "")) return 65;
  return 45;
}

function rankedSort(left: RankedSuggestion, right: RankedSuggestion) {
  return (
    right.score - left.score ||
    right.publishedAt - left.publishedAt ||
    left.title.localeCompare(right.title, "en-US")
  );
}

function storyMatches(story: Story, query: string) {
  const values = [
    story.headline,
    story.dek,
    story.location,
    story.categoryLabel,
    ...story.tags,
    ...(story.authors?.length ? story.authors : [story.author]).map(
      (author) => author.name,
    ),
  ];
  return Math.max(...values.map((value) => matchScore(value, query)));
}

/**
 * Maps only already-published Story records into first-party destinations.
 * No model or requester-controlled value can supply an arbitrary URL or ID.
 */
export function buildPublicSearchSuggestionGroups(
  stories: readonly Story[],
  rawQuery: string,
  limit = 5,
): PublicSearchSuggestionGroups {
  const query = normalize(rawQuery);
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 8);
  if (query.length < 2) return { topics: [], people: [], stories: [] };

  const topics = new Map<string, RankedSuggestion>();
  const people = new Map<string, RankedSuggestion>();
  const storySuggestions: RankedSuggestion[] = [];

  for (const story of stories) {
    if (story.status !== "published" || story.noIndex) continue;
    const publishedAt = Date.parse(story.publishedAt) || 0;
    const storyScore = storyMatches(story, query);
    if (storyScore > 0) {
      storySuggestions.push({
        id: `story:${story.id}`,
        kind: "story",
        title: story.headline,
        description: `${story.categoryLabel} · ${story.readingMinutes} min read`,
        href: `/story/${encodeURIComponent(story.slug)}`,
        score: storyScore,
        publishedAt,
      });
    }

    const topicCandidates = [
      {
        key: `category:${normalize(story.category)}`,
        title: story.categoryLabel,
        href: `/category/${encodeURIComponent(story.category)}`,
        description: "Section",
      },
      ...story.tags.map((tag) => ({
        key: `tag:${normalize(tag)}`,
        title: tag,
        href: `/search?q=${encodeURIComponent(tag)}`,
        description: "Topic",
      })),
    ];

    for (const topic of topicCandidates) {
      const score = matchScore(topic.title, query);
      if (!score || topics.has(topic.key)) continue;
      topics.set(topic.key, {
        id: topic.key,
        kind: "topic",
        title: topic.title,
        description: topic.description,
        href: topic.href,
        score,
        publishedAt,
      });
    }

    const authors = story.authors?.length ? story.authors : [story.author];
    for (const author of authors) {
      const score = matchScore(author.name, query);
      const key = author.profileSlug
        ? `person:${normalize(author.profileSlug)}`
        : `person:${normalize(author.name)}`;
      if (!score || people.has(key)) continue;
      people.set(key, {
        id: key,
        kind: "person",
        title: author.name,
        description: author.role || "Contributor",
        href: author.profileSlug
          ? `/author/${encodeURIComponent(author.profileSlug)}`
          : `/search?q=${encodeURIComponent(author.name)}`,
        score,
        publishedAt,
      });
    }
  }

  function project(item: RankedSuggestion): PublicSearchSuggestion {
    return {
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      href: item.href,
    };
  }

  return {
    topics: [...topics.values()].sort(rankedSort).slice(0, boundedLimit).map(project),
    people: [...people.values()].sort(rankedSort).slice(0, boundedLimit).map(project),
    stories: storySuggestions.sort(rankedSort).slice(0, boundedLimit).map(project),
  };
}

export function publicSearchSuggestionCount(groups: PublicSearchSuggestionGroups) {
  return groups.topics.length + groups.people.length + groups.stories.length;
}
