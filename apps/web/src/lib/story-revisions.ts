export const editableStoryFields = [
  ["headline", "Headline"],
  ["dek", "Summary"],
  ["body", "Story body"],
  ["whyItMatters", "Why it matters"],
  ["categorySlug", "Section"],
  ["location", "Dateline"],
  ["imageUrl", "Lead image"],
  ["imageAlt", "Image description"],
  ["tags", "Tags"],
  ["seoTitle", "SEO title"],
  ["seoDescription", "Search description"],
  ["canonicalUrl", "Canonical URL"],
  ["noIndex", "Search indexing"],
  ["isBreaking", "Breaking-news treatment"],
] as const;

type RevisionValue = string | string[] | boolean | null | undefined;
export type StoryRevisionSnapshot = Record<string, unknown>;

export type StoryFieldChange = {
  field: string;
  label: string;
  before: string;
  after: string;
  lines?: StoryDiffLine[];
};

export type StoryDiffLine = {
  kind: "same" | "added" | "removed";
  value: string;
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
    const previous = formatRevisionValue(before[field] as RevisionValue);
    const next = formatRevisionValue(after[field] as RevisionValue);
    if (previous === next) return [];
    return [{
      field,
      label,
      before: previous,
      after: next,
      ...(field === "body"
        ? { lines: diffStoryLines(previous, next) }
        : {}),
    }];
  });
  return [...richFormattingChange, ...fieldChanges];
}

export function diffStoryLines(before: string, after: string): StoryDiffLine[] {
  const left = before.split("\n");
  const right = after.split("\n");
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
  return result;
}

function formatRevisionValue(value: RevisionValue) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return value ?? "";
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
