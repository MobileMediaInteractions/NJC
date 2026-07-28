import assert from "node:assert/strict";
import test from "node:test";
import {
  futureLocalDateTime,
  generatedSlug,
  initialScopeId,
  resolveAccessEnd,
} from "../src/lib/studio-guided-forms";

test("guided duration presets resolve without manually entered IDs or ISO values", () => {
  const start = new Date("2026-01-01T12:00:00.000Z");
  assert.equal(resolveAccessEnd("permanent", "", start), null);
  assert.equal(resolveAccessEnd("7_days", "", start), "2026-01-08T12:00:00.000Z");
  assert.equal(resolveAccessEnd("custom", "not-a-date", start), null);
  assert.equal(resolveAccessEnd("30_days", "", new Date("invalid")), null);
  assert.match(futureLocalDateTime(30, start), /^2026-01-31T/);
});

test("generated slugs remain predictable and safe", () => {
  assert.equal(generatedSlug("Middlesex County’s New Plan"), "middlesex-countys-new-plan");
  assert.equal(generatedSlug("  Route 9 / Transit  "), "route-9-transit");
});

test("changing access scope clears invalid dependent selections", () => {
  assert.equal(initialScopeId("product"), "njc_plus");
  assert.equal(initialScopeId("tier"), "");
  assert.equal(initialScopeId("content"), "");
});
