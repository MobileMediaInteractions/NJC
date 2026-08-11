import { monitorCatalog, type MonitorDefinition } from "@/lib/monitor-catalog";
import type { ServiceSnapshot, ServiceState, StatusPayload } from "@/lib/status-types";
import { readStatusHistory, summarizeHistory } from "@/lib/status-storage";

export type LiveCheck = {
  id: string;
  state: ServiceState;
  detail: string;
  latencyMs: number | null;
  checkedAt: string;
};

export function classifyHttpStatus(status: number, expectedStatuses: readonly number[]): ServiceState {
  if (expectedStatuses.includes(status)) return "operational";
  if (status >= 400 && status < 500) return "degraded";
  return "outage";
}

async function checkHttp(definition: MonitorDefinition, now: string): Promise<LiveCheck> {
  if (!definition.url) throw new Error("HTTP monitor is missing its fixed URL");
  const startedAt = performance.now();
  const configuredTimeout = Number(process.env.STATUS_CHECK_TIMEOUT_MS ?? 6_000);
  const timeoutMs = Number.isFinite(configuredTimeout) ? Math.min(12_000, Math.max(2_000, configuredTimeout)) : 6_000;
  try {
    const response = await fetch(definition.url, {
      cache: "no-store",
      redirect: "manual",
      headers: { "User-Agent": "NJC-Status/1.0 (+https://status.thejerseycourier.com)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const state = classifyHttpStatus(response.status, definition.expectedStatuses);
    return {
      id: definition.id,
      state,
      detail: state === "operational" ? `HTTP ${response.status} matched the expected contract` : `HTTP ${response.status} did not match the expected contract`,
      latencyMs,
      checkedAt: now,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      id: definition.id,
      state: "outage",
      detail: timedOut ? `No response within ${timeoutMs} ms` : "The public endpoint could not be reached",
      latencyMs,
      checkedAt: now,
    };
  }
}

export async function collectLiveChecks(now = new Date()): Promise<LiveCheck[]> {
  const checkedAt = now.toISOString();
  return Promise.all(monitorCatalog.map((definition) => {
    if (definition.mode === "protected") {
      return Promise.resolve({ id: definition.id, state: "protected" as const, detail: "Not publicly monitored by design", latencyMs: null, checkedAt });
    }
    if (definition.mode === "self") {
      return Promise.resolve({ id: definition.id, state: "operational" as const, detail: "This independent status response is available", latencyMs: 0, checkedAt });
    }
    return checkHttp(definition, checkedAt);
  }));
}

export function deriveOverall(states: readonly ServiceState[]) {
  const counted = states.filter((state) => state !== "protected" && state !== "unknown");
  if (!counted.length) return "unknown" as const;
  if (counted.some((state) => state === "outage")) return "outage" as const;
  if (counted.some((state) => state === "degraded")) return "degraded" as const;
  return "operational" as const;
}

function overallLabel(state: StatusPayload["overall"]) {
  if (state === "operational") return "All monitored systems are operational";
  if (state === "degraded") return "Some systems are experiencing degraded service";
  if (state === "outage") return "One or more systems are unavailable";
  return "Current system state is not yet available";
}

export async function buildStatusPayload(now = new Date()): Promise<StatusPayload> {
  const [checks, historyResult] = await Promise.all([
    collectLiveChecks(now),
    readStatusHistory(now).catch(() => ({ available: false, documents: [] })),
  ]);
  const checksById = new Map(checks.map((check) => [check.id, check]));
  const services: ServiceSnapshot[] = monitorCatalog.map((definition) => {
    const check = checksById.get(definition.id);
    if (!check) throw new Error(`Missing live check for ${definition.id}`);
    const history = summarizeHistory(definition.id, historyResult.documents, now);
    return {
      id: definition.id,
      group: definition.group,
      title: definition.title,
      description: definition.description,
      hostname: definition.hostname,
      state: check.state,
      detail: check.detail,
      latencyMs: check.latencyMs,
      checkedAt: check.checkedAt,
      expectedBehavior: definition.expectedBehavior,
      history: history.points,
      uptime90Days: history.uptimePercent,
    };
  });
  const overall = deriveOverall(services.map((service) => service.state));
  const counts: StatusPayload["counts"] = { operational: 0, degraded: 0, outage: 0, protected: 0, unknown: 0 };
  for (const service of services) counts[service.state] += 1;
  return {
    generatedAt: now.toISOString(),
    overall,
    overallLabel: overallLabel(overall),
    counts,
    historyAvailable: historyResult.available,
    services,
  };
}
