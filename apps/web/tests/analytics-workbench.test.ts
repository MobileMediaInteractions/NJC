import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbenchPath = new URL(
  "../src/components/studio/analytics-workbench.tsx",
  import.meta.url,
);

test("the analytics workspace uses a bounded desktop canvas without scroll containers", async () => {
  const source = await readFile(workbenchPath, "utf8");

  assert.match(source, /h-\[calc\(100dvh-8rem\)\]/);
  assert.match(source, /overflow-hidden/);
  assert.doesNotMatch(source, /\boverflow-(?:auto|scroll|x-auto|x-scroll|y-auto|y-scroll)\b/);
});

test("unsupported smaller viewports receive an intentional size notice", async () => {
  const source = await readFile(workbenchPath, "utf8");

  assert.match(source, /lg:hidden/);
  assert.match(source, /Analytics needs a larger workspace/);
  assert.match(source, /1440×900 or larger/);
});

test("dense analytics datasets are segmented and paginated instead of stacked", async () => {
  const source = await readFile(workbenchPath, "utf8");

  for (const label of [
    "Overview",
    "Content",
    "Acquisition",
    "Platforms",
    "Versions",
    "Archives",
    "Audit",
  ]) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }

  assert.match(source, /function Pager\(/);
  assert.doesNotMatch(source, /<table\b/);
});
