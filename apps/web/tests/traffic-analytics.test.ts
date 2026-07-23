import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDevicePlatform,
  classifyTrafficSource,
  completedAnalyticsPeriods,
  normalizeAnalyticsPathname,
  publicationDay,
} from "../src/lib/traffic-analytics";

test("traffic sources are reduced to privacy-safe acquisition categories", () => {
  assert.equal(classifyTrafficSource("", null, "https://www.thejerseycourier.com"), "direct");
  assert.equal(classifyTrafficSource("https://t.co/example"), "x");
  assert.equal(classifyTrafficSource("https://l.facebook.com/l.php"), "facebook");
  assert.equal(classifyTrafficSource("https://www.instagram.com/"), "instagram");
  assert.equal(classifyTrafficSource("https://news.google.com/articles/abc"), "google");
  assert.equal(classifyTrafficSource("https://www.thejerseycourier.com/latest", null, "https://www.thejerseycourier.com"), "internal");
  assert.equal(classifyTrafficSource("", "newsletter"), "email");
  assert.equal(classifyTrafficSource("https://example.org/post"), "other");
});

test("web devices are grouped without retaining a fingerprint", () => {
  assert.equal(classifyDevicePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "mobile");
  assert.equal(classifyDevicePlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit Mobile"), "mobile");
  assert.equal(classifyDevicePlatform("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)"), "tablet");
  assert.equal(classifyDevicePlatform("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit"), "tablet");
  assert.equal(classifyDevicePlatform("Mozilla/5.0 (SMART-TV; Linux; Tizen 8.0)"), "tv");
  assert.equal(classifyDevicePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), "desktop");
  assert.equal(classifyDevicePlatform("", "?1"), "mobile");
});

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
