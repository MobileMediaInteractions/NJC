import { isStoryNoteType, storyNoteLabel } from "@/lib/story-notes";

export const editableStoryFields = [
  ["headline", "Headline"],
  ["dek", "Summary"],
  ["body", "Story body"],
  ["whyItMatters", "Why it matters"],
  ["publicNoteType", "Story-note type"],
  ["publicNote", "Public story note"],
  ["slug", "Story URL"],
  ["categorySlug", "Section"],
  ["location", "Dateline"],
  ["publicBylineSnapshot", "Public byline"],
  ["imageUrl", "Lead image"],
  ["imageAlt", "Image description"],
  ["imageKind", "Lead-image type"],
  ["videoUrl", "Video"],
  ["tags", "Tags"],
  ["seoTitle", "SEO title"],
  ["seoDescription", "Search description"],
  ["canonicalUrl", "Canonical URL"],
  ["noIndex", "Search indexing"],
  ["isBreaking", "Breaking-news treatment"],
  ["status", "Publication state"],
  ["scheduledAt", "Publication schedule"],
] as const;

type RevisionValue = unknown;
export type StoryRevisionSnapshot = Record<string, unknown>;

export type StoryFieldChange = {
  field: string;
  label: string;
  before: string;
  after: string;
  lines?: StoryDiffLine[];
};

export type StoryDiffToken = {
  kind: "same" | "added" | "removed";
  value: string;
};

export type StoryDiffLine = {
  kind: "same" | "added" | "removed";
  value: string;
  tokens?: StoryDiffToken[];
};

export function buildStoryRevisionDiff(
  before: StoryRevisionSnapshot,
  after: StoryRevisionSnapshot,
): StoryFieldChange[] {
  const richFormattingChange: StoryFieldChange[] =
    stableJson(before.richBody) === stableJson(after.richBody)
      ? []
      : [{
          field: "richBody",
          label: "Rich formatting and structure",
          before: before.richBody ? "Structured formatting present" : "Plain paragraphs only",
          after: after.richBody ? "Structured formatting present (changed)" : "Plain paragraphs only",
        }];
  const fieldChanges: StoryFieldChange[] = editableStoryFields.flatMap(([field, label]) => {
    const previous = formatRevisionValue(before[field] as RevisionValue, field);
    const next = formatRevisionValue(after[field] as RevisionValue, field);
    if (previous === next) return [];
    return [{
      field,
      label,
      before: previous,
      after: next,
      ...(field === "body" || field === "headline" || field === "dek" || field === "publicNote"
        ? { lines: diffStoryLines(previous, next) }
        : {}),
    }];
  });
  return [...richFormattingChange, ...fieldChanges];
}

export function hasMeaningfulStoryRevisionChange(
  before: StoryRevisionSnapshot,
  after: StoryRevisionSnapshot,
) {
  return (
    buildStoryRevisionDiff(before, after).length > 0 ||
    stableJson(before.imageAssetId) !== stableJson(after.imageAssetId) ||
    stableJson(before.publicBylineSnapshot) !== stableJson(after.publicBylineSnapshot)
  );
}

export function diffStoryLines(before: string, after: string): StoryDiffLine[] {
  const left = before.split("\n");
  const right = after.split("\n");
  const matrix = longestCommonSubsequence(left, right);
  const result: StoryDiffLine[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      result.push({ kind: "same", value: left[leftIndex]! });
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      matrix[leftIndex + 1]![rightIndex]! >=
      matrix[leftIndex]![rightIndex + 1]!
    ) {
      result.push({ kind: "removed", value: left[leftIndex]! });
      leftIndex += 1;
    } else {
      result.push({ kind: "added", value: right[rightIndex]! });
      rightIndex += 1;
    }
  }
  while (leftIndex < left.length) {
    result.push({ kind: "removed", value: left[leftIndex]! });
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    result.push({ kind: "added", value: right[rightIndex]! });
    rightIndex += 1;
  }
  return attachWordDiffs(result);
}

export function diffStoryWords(before: string, after: string): {
  before: StoryDiffToken[];
  after: StoryDiffToken[];
} {
  const left = tokenizeWords(before);
  const right = tokenizeWords(after);
  const matrix = longestCommonSubsequence(left, right);
  const beforeTokens: StoryDiffToken[] = [];
  const afterTokens: StoryDiffToken[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      const token = { kind: "same" as const, value: left[leftIndex]! };
      beforeTokens.push(token);
      afterTokens.push(token);
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      matrix[leftIndex + 1]![rightIndex]! >=
      matrix[leftIndex]![rightIndex + 1]!
    ) {
      beforeTokens.push({ kind: "removed", value: left[leftIndex]! });
      leftIndex += 1;
    } else {
      afterTokens.push({ kind: "added", value: right[rightIndex]! });
      rightIndex += 1;
    }
  }
  while (leftIndex < left.length) {
    beforeTokens.push({ kind: "removed", value: left[leftIndex++]! });
  }
  while (rightIndex < right.length) {
    afterTokens.push({ kind: "added", value: right[rightIndex++]! });
  }
  return { before: beforeTokens, after: afterTokens };
}

function attachWordDiffs(lines: StoryDiffLine[]) {
  const result: StoryDiffLine[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]!;
    const next = lines[index + 1];
    if (current.kind === "removed" && next?.kind === "added") {
      const words = diffStoryWords(current.value, next.value);
      result.push({ ...current, tokens: words.before });
      result.push({ ...next, tokens: words.after });
      index += 1;
    } else {
      result.push(current);
    }
  }
  return result;
}

function longestCommonSubsequence(left: string[], right: string[]) {
  const matrix = Array.from(
    { length: left.length + 1 },
    () => Array<number>(right.length + 1).fill(0),
  );
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      matrix[leftIndex]![rightIndex] =
        left[leftIndex] === right[rightIndex]
          ? 1 + matrix[leftIndex + 1]![rightIndex + 1]!
          : Math.max(
              matrix[leftIndex + 1]![rightIndex]!,
              matrix[leftIndex]![rightIndex + 1]!,
            );
    }
  }
  return matrix;
}

function tokenizeWords(value: string) {
  return value.match(/\s+|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?|[^\s\p{L}\p{N}]/gu) ?? [];
}

function formatRevisionValue(value: RevisionValue, field: string) {
  if (field === "publicNoteType" && isStoryNoteType(value)) {
    return storyNoteLabel(value);
  }
  if (field === "publicBylineSnapshot" && isObject(value)) {
    const name = typeof value.name === "string" ? value.name : "Assigned byline";
    const mode = value.mode === "pseudonym" ? "pseudonym" : "account identity";
    return `${name} · ${mode}`;
  }
  if (field === "scheduledAt" && value) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (value && typeof value === "object") return stableJson(value);
  return value === null || value === undefined ? "" : String(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
