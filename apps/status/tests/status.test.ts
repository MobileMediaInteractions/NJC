import assert from "node:assert/strict";
import test from "node:test";
import { managedDomainCatalog } from "@njcourier/domain-registry";
import { monitorCatalog } from "../src/lib/monitor-catalog";
import { classifyHttpStatus, deriveOverall, type LiveCheck } from "../src/lib/status-monitor";
import { applyChecksToDailyDocument, summarizeHistory, type DailyDocument } from "../src/lib/status-storage";

test("status catalog covers the apex, permanent origin, and every managed subdomain", () => {
  const ids = new Set(monitorCatalog.map((entry) => entry.id));
  assert.equal(ids.size, monitorCatalog.length);
  assert.equal(ids.has("apex"), true);
  assert.equal(ids.has("vercel-fallback"), true);
  for (const domain of managedDomainCatalog) assert.equal(ids.has(domain.label), true, domain.label);
});

test("checks evaluate each endpoint against its own response contract", () => {
  assert.equal(classifyHttpStatus(308, [301, 302, 307, 308]), "operational");
  assert.equal(classifyHttpStatus(401, [200, 401, 403]), "operational");
  assert.equal(classifyHttpStatus(404, [200]), "degraded");
  assert.equal(classifyHttpStatus(503, [200]), "outage");
});

test("protected and unknown services never invent an overall outage", () => {
  assert.equal(deriveOverall(["protected", "unknown"]), "unknown");
  assert.equal(deriveOverall(["operational", "protected"]), "operational");
  assert.equal(deriveOverall(["operational", "degraded"]), "degraded");
  assert.equal(deriveOverall(["degraded", "outage"]), "outage");
});

test("daily aggregation and 90-day summaries retain exact sample truth", () => {
  const document: DailyDocument = { version: 1, date: "2026-08-11", samples: 0, components: {} };
  const base = { detail: "test", latencyMs: 120, checkedAt: "2026-08-11T12:00:00Z" };
  const checks: LiveCheck[] = [
    { ...base, id: "www", state: "operational" },
    { ...base, id: "api", state: "degraded" },
    { ...base, id: "int", state: "protected", latencyMs: null },
  ];
  applyChecksToDailyDocument(document, checks);
  applyChecksToDailyDocument(document, [{ ...base, id: "www", state: "outage", latencyMs: 400 }]);
  assert.equal(document.samples, 2);
  assert.deepEqual(document.components.www, { samples: 2, operational: 1, degraded: 0, outage: 1, latencyTotalMs: 520, latencySamples: 2 });
  assert.equal(document.components.int, undefined);
  const summary = summarizeHistory("www", [document], new Date("2026-08-11T18:00:00Z"));
  assert.equal(summary.points.length, 90);
  assert.equal(summary.points.at(-1)?.state, "outage");
  assert.equal(summary.points.at(-1)?.uptimePercent, 50);
  assert.equal(summary.points.at(-1)?.averageLatencyMs, 260);
  assert.equal(summary.uptimePercent, 50);
});
