import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbenchPath = new URL(
  "../src/components/studio/analytics-workbench.tsx",
  import.meta.url,
);

test("the analytics workspace renders at every supported viewport", async () => {
  const source = await readFile(workbenchPath, "utf8");

  assert.match(source, /min-h-\[42rem\]/);
  assert.match(source, /sm:grid-cols-4/);
  assert.doesNotMatch(source, /Analytics needs a larger workspace/);
  assert.doesNotMatch(source, /lg:hidden/);
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

test("content, acquisition and platforms share one persistent resettable range", async () => {
  const source = await readFile(workbenchPath, "utf8");
  assert.match(source, /useState<AnalyticsTimeRange>\("30d"\)/);
  assert.match(source, /Shared analytics time range/);
  assert.match(source, /setRange\("30d"\)/);
  assert.match(source, /<Content key=\{range\} traffic=\{traffic\} range=\{range\}/);
  assert.match(source, /<Acquisition sources=\{traffic\.sources\} devices=\{traffic\.devices\} range=\{range\}/);
  assert.match(source, /<Platforms audience=\{audience\} range=\{range\}/);
});

test("version evidence and production reconciliation are permission controlled", async () => {
  const source = await readFile(workbenchPath, "utf8");
  assert.match(source, /canInspect=\{canExport\}/);
  assert.match(source, /version-evidence/);
  assert.match(source, /Run production reconciliation/);
  assert.match(source, /studio\/analytics\/audit/);
});
