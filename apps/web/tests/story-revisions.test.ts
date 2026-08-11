import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStoryRevisionDiff,
  diffStoryLines,
  diffStoryWords,
  hasMeaningfulStoryRevisionChange,
} from "../src/lib/story-revisions";
import { createPlainStoryRichTextDocument } from "../src/lib/story-rich-text";

test("story revision comparisons include only changed editorial fields", () => {
  const changes = buildStoryRevisionDiff(
    {
      headline: "Council adopts budget",
      dek: "The original summary",
      body: ["First paragraph.", "Old second paragraph."],
      categorySlug: "local",
      isBreaking: false,
      internalSecret: "never expose this",
    },
    {
      headline: "Council adopts revised budget",
      dek: "The original summary",
      body: ["First paragraph.", "New second paragraph."],
      categorySlug: "politics",
      isBreaking: true,
      internalSecret: "changed but not editorial",
    },
  );

  assert.deepEqual(
    changes.map((change) => change.field),
    ["headline", "body", "categorySlug", "isBreaking"],
  );
  assert.equal(changes.some((change) => change.field === "internalSecret"), false);
  assert.deepEqual(
    changes.find((change) => change.field === "body")?.lines?.map(({ kind, value }) => ({ kind, value })),
    [
      { kind: "same", value: "First paragraph." },
      { kind: "removed", value: "Old second paragraph." },
      { kind: "added", value: "New second paragraph." },
    ],
  );
});

test("line comparison preserves additions and removals around shared copy", () => {
  assert.deepEqual(diffStoryLines("A\nB\nD", "A\nC\nD").map(({ kind, value }) => ({ kind, value })), [
    { kind: "same", value: "A" },
    { kind: "removed", value: "B" },
    { kind: "added", value: "C" },
    { kind: "same", value: "D" },
  ]);
});

test("revision comparisons flag formatting-only changes", () => {
  const before = createPlainStoryRichTextDocument(["Verified copy."]);
  const after = createPlainStoryRichTextDocument(["Verified copy."]);
  after.state.root.children![0]!.children![0]!.format = 1;

  const changes = buildStoryRevisionDiff(
    { body: ["Verified copy."], richBody: before },
    { body: ["Verified copy."], richBody: after },
  );

  assert.deepEqual(changes.map((change) => change.field), ["richBody"]);
});

test("word comparison isolates a single prose change", () => {
  const changes = diffStoryWords(
    "The project launches in September.",
    "The project launches in October.",
  );

  assert.deepEqual(
    changes.before.filter((token) => token.kind === "removed").map((token) => token.value),
    ["September"],
  );
  assert.deepEqual(
    changes.after.filter((token) => token.kind === "added").map((token) => token.value),
    ["October"],
  );
  const lines = diffStoryLines(
    "The project launches in September.",
    "The project launches in October.",
  );
  assert.equal(lines[0]?.tokens?.some((token) => token.kind === "removed"), true);
  assert.equal(lines[1]?.tokens?.some((token) => token.kind === "added"), true);
});

test("meaningful revision detection covers workflow, byline and media metadata", () => {
  const baseline = {
    headline: "Verified headline",
    body: ["Verified copy."],
    status: "draft",
    publicBylineSnapshot: { name: "Courier Reporter" },
    imageUrl: "https://cdn.example.com/old.jpg",
    imageAlt: "Council members seated at the dais.",
  };
  assert.equal(hasMeaningfulStoryRevisionChange(baseline, { ...baseline }), false);
  assert.equal(hasMeaningfulStoryRevisionChange(baseline, { ...baseline, status: "review" }), true);
  assert.equal(hasMeaningfulStoryRevisionChange(baseline, {
    ...baseline,
    imageAlt: "Council members vote from the dais.",
  }), true);
});
