import type { Story } from "@harborline/contracts";
import { legacyRokuV1UserAgent, officialReaderClients } from "@/lib/reader-api-access";
import { storyNoteLabel } from "@/lib/story-notes";

export const STRUCTURED_STORY_NOTES_CAPABILITY = "structured-story-notes-v1";

export type ReaderCompatibilityProfile =
  | "current"
  | "legacy_story_body"
  | "roku_1_0_0";

function requestCapabilities(request: Request) {
  return new Set(
    (request.headers.get("x-njc-capabilities") ?? "")
      .split(/[\s,]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function readerCompatibilityProfile(request: Request): ReaderCompatibilityProfile {
  if (requestCapabilities(request).has(STRUCTURED_STORY_NOTES_CAPABILITY)) return "current";
  const userAgent = request.headers.get("user-agent") ?? "";
  if (legacyRokuV1UserAgent.test(userAgent)) return "roku_1_0_0";
  const client = request.headers.get("x-njc-client")?.toLowerCase();
  if (officialReaderClients.includes(client as (typeof officialReaderClients)[number])) {
    return "legacy_story_body";
  }
  return "current";
}

function noteParagraph(story: Story) {
  if (!story.publicNoteType || !story.publicNote?.trim()) return null;
  return `${storyNoteLabel(story.publicNoteType).toUpperCase()}\n${story.publicNote.trim()}`;
}

function legacyCategoryLabel(story: Story) {
  const labels = [
    story.isBreaking ? "BREAKING" : null,
    story.isExclusive ? "EXCLUSIVE" : null,
    story.isDeveloping ? "DEVELOPING" : null,
    story.categoryLabel,
  ].filter((value): value is string => Boolean(value));
  return labels.join(" · ");
}

function absoluteStoryImage(image: string, requestUrl: string) {
  try {
    return new URL(image, new URL(requestUrl).origin).toString();
  } catch {
    return image;
  }
}

/**
 * Projects new story fields onto contracts that shipped before capability
 * negotiation. The exact Roku 1.0.0 branch is intentionally bounded to its
 * immutable historical reader: it reads only body[0] and cannot resolve a
 * site-relative fallback image.
 */
export function projectStoryForReader(
  story: Story,
  request: Request,
  profile = readerCompatibilityProfile(request),
): Story {
  if (profile === "current") return story;
  const legacyStory = { ...story };
  delete legacyStory.publicNote;
  delete legacyStory.publicNoteType;
  const publicNote = noteParagraph(story);

  if (profile === "legacy_story_body") {
    return {
      ...legacyStory,
      body: publicNote ? [...story.body, publicNote] : story.body,
    };
  }

  const byline = (story.authors?.length ? story.authors : [story.author])
    .map((author) => author.name)
    .join(" and ");
  const paragraphs = [
    byline ? `BY ${byline.toUpperCase()}` : null,
    ...story.body,
    story.whyItMatters ? `WHY IT MATTERS\n${story.whyItMatters}` : null,
    story.tags.length ? `TOPICS\n${story.tags.join(" · ")}` : null,
    publicNote,
  ].filter((value): value is string => Boolean(value));

  return {
    ...legacyStory,
    categoryLabel: legacyCategoryLabel(story),
    image: absoluteStoryImage(story.image, request.url),
    // Roku 1.0.0's firstBody() consumes only index zero.
    body: [paragraphs.join("\n\n")],
  };
}

export function projectStoriesForReader(stories: Story[], request: Request) {
  const profile = readerCompatibilityProfile(request);
  return {
    data: stories.map((story) => projectStoryForReader(story, request, profile)),
    profile,
  };
}
