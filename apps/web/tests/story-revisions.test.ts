import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStoryRevisionDiff,
  diffStoryLines,
} from "../src/lib/story-revisions";

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
    changes.find((change) => change.field === "body")?.lines,
    [
      { kind: "same", value: "First paragraph." },
      { kind: "removed", value: "Old second paragraph." },
      { kind: "added", value: "New second paragraph." },
    ],
  );
});

test("line comparison preserves additions and removals around shared copy", () => {
  assert.deepEqual(diffStoryLines("A\nB\nD", "A\nC\nD"), [
    { kind: "same", value: "A" },
    { kind: "removed", value: "B" },
    { kind: "added", value: "C" },
    { kind: "same", value: "D" },
  ]);
});
