import { z } from "zod";

export const pseudonymMinimumLength = 2;
export const pseudonymMaximumLength = 80;

export type StoryBylineOption = {
  mode: "account" | "pseudonym";
  name: string;
  available: boolean;
};

export type PublicBylineData = {
  mode: "account" | "pseudonym";
  name: string;
  initials: string;
  role: string;
  avatar?: string;
  profileSlug?: string;
  pseudonymRevision?: number;
};

const reservedPseudonyms = new Set([
  "admin",
  "administrator",
  "courier newsroom",
  "editor",
  "new jersey courier",
  "newsroom",
  "nj courier",
  "njc",
  "staff",
  "the courier",
  "the new jersey courier",
]);

export function normalizePseudonym(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function hasUnsafePseudonymContent(value: string) {
  return (
    /[\u0000-\u001f\u007f]/u.test(value) ||
    /[<>]/u.test(value) ||
    /(?:https?:\/\/|www\.|mailto:)/iu.test(value) ||
    /\S+@\S+\.\S+/u.test(value)
  );
}

export const pseudonymSchema = z
  .string()
  .trim()
  .max(pseudonymMaximumLength)
  .superRefine((value, context) => {
    if (!value) return;
    const normalized = normalizePseudonym(value);
    if (normalized.length < pseudonymMinimumLength) {
      context.addIssue({
        code: "custom",
        message: `A pseudonym must contain at least ${pseudonymMinimumLength} characters.`,
      });
    }
    if (reservedPseudonyms.has(normalized)) {
      context.addIssue({
        code: "custom",
        message: "Choose a pseudonym that cannot be mistaken for the publication or a newsroom role.",
      });
    }
    if (hasUnsafePseudonymContent(value)) {
      context.addIssue({
        code: "custom",
        message: "Pseudonyms must be plain names without markup, contact information or links.",
      });
    }
  });

export function pseudonymConflictsWithNames(
  pseudonym: string,
  names: Iterable<string>,
) {
  const normalized = normalizePseudonym(pseudonym);
  return [...names].some((name) => normalizePseudonym(name) === normalized);
}

export function initialsForByline(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => [...part][0] ?? "")
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("en-US");
}

export function legacyPublicBylineSnapshot(input: {
  authorSnapshot: {
    name: string;
    role: string;
    initials: string;
    avatar?: string;
  } | null;
}): PublicBylineData {
  const author = input.authorSnapshot ?? {
    name: "Courier Newsroom",
    role: "Middlesex County desk",
    initials: "NJC",
  };
  return {
    mode: "account",
    name: author.name,
    role: author.role,
    initials: author.initials,
    ...(author.avatar ? { avatar: author.avatar } : {}),
  };
}

export function publicStoryAuthor(storyId: string, byline: PublicBylineData) {
  return {
    id: byline.profileSlug ?? `story-${storyId}-byline`,
    mode: byline.mode,
    name: byline.name,
    role: byline.role,
    initials: byline.initials,
    ...(byline.avatar ? { avatar: byline.avatar } : {}),
    ...(byline.profileSlug ? { profileSlug: byline.profileSlug } : {}),
  };
}
