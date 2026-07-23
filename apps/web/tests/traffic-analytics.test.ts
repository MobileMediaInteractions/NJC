import assert from "node:assert/strict";
import test from "node:test";
import {
  completedAnalyticsPeriods,
  normalizeAnalyticsPathname,
  publicationDay,
} from "../src/lib/traffic-analytics";

test("traffic paths include public pages and reject internal application routes", () => {
  assert.equal(normalizeAnalyticsPathname("/story/council-budget?share=fresh"), "/story/council-budget");
  assert.equal(normalizeAnalyticsPathname("/latest/"), "/latest");
  assert.equal(normalizeAnalyticsPathname("/studio/analytics"), null);
  assert.equal(normalizeAnalyticsPathname("/api/v1/stories"), null);
  assert.equal(normalizeAnalyticsPathname("//outside.example/story"), null);
  assert.equal(normalizeAnalyticsPathname("/story/%E0%A4%A"), null);
});

test("publication days follow the New Jersey calendar instead of UTC", () => {
  const lateEvening = new Date("2026-07-23T03:30:00.000Z");
  assert.equal(publicationDay(lateEvening, "America/New_York"), "2026-07-22");
  assert.equal(publicationDay(lateEvening, "UTC"), "2026-07-23");
});

test("archive planning closes complete Monday-through-Sunday weeks only", () => {
  const ranges = completedAnalyticsPeriods("2026-07-01", "2026-07-22").filter((range) => range.period === "week");
  assert.deepEqual(ranges, [
    { period: "week", periodStart: "2026-06-29", periodEnd: "2026-07-05" },
    { period: "week", periodStart: "2026-07-06", periodEnd: "2026-07-12" },
    { period: "week", periodStart: "2026-07-13", periodEnd: "2026-07-19" },
  ]);
});

test("archive planning retains completed month and year snapshots", () => {
  const ranges = completedAnalyticsPeriods("2025-12-20", "2026-02-04");
  assert.ok(ranges.some((range) => range.period === "month" && range.periodStart === "2025-12-01" && range.periodEnd === "2025-12-31"));
  assert.ok(ranges.some((range) => range.period === "month" && range.periodStart === "2026-01-01" && range.periodEnd === "2026-01-31"));
  assert.ok(ranges.some((range) => range.period === "year" && range.periodStart === "2025-01-01" && range.periodEnd === "2025-12-31"));
});
