import type { LiveCheck } from "@/lib/status-monitor";
import type { HistoryPoint, ServiceState } from "@/lib/status-types";

type DailyComponent = {
  samples: number;
  operational: number;
  degraded: number;
  outage: number;
  latencyTotalMs: number;
  latencySamples: number;
};

export type DailyDocument = {
  version: 1;
  date: string;
  samples: number;
  components: Record<string, DailyComponent>;
};

function redisConfiguration() {
  const baseUrl = process.env.STATUS_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.STATUS_REDIS_REST_TOKEN;
  return baseUrl && token ? { baseUrl, token } : null;
}

export function isStatusHistoryConfigured() {
  return Boolean(redisConfiguration());
}

async function redisCommand<T>(args: Array<string | number>) {
  const configuration = redisConfiguration();
  if (!configuration) return null;
  const response = await fetch(configuration.baseUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${configuration.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Status history storage returned ${response.status}`);
  const body = await response.json() as { result?: T; error?: string };
  if (body.error) throw new Error("Status history storage rejected the command");
  return body.result ?? null;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function historyKey(date: string) {
  return `njc:status:daily:${date}`;
}

export function applyChecksToDailyDocument(document: DailyDocument, checks: readonly LiveCheck[]) {
  document.samples += 1;
  for (const check of checks) {
    if (check.state === "protected" || check.state === "unknown") continue;
    const current = document.components[check.id] ?? {
      samples: 0,
      operational: 0,
      degraded: 0,
      outage: 0,
      latencyTotalMs: 0,
      latencySamples: 0,
    };
    current.samples += 1;
    current[check.state] += 1;
    if (check.latencyMs !== null) {
      current.latencyTotalMs += check.latencyMs;
      current.latencySamples += 1;
    }
    document.components[check.id] = current;
  }
  return document;
}

export async function recordStatusSnapshot(checks: readonly LiveCheck[], now = new Date()) {
  if (!redisConfiguration()) return { stored: false, reason: "storage_not_configured" as const };
  const bucket = Math.floor(now.getTime() / (5 * 60_000));
  const lock = await redisCommand<string>(["SET", `njc:status:collect:${bucket}`, "1", "EX", 360, "NX"]);
  if (lock !== "OK") return { stored: false, reason: "bucket_already_recorded" as const };
  const date = dateKey(now);
  const existing = await redisCommand<string>(["GET", historyKey(date)]);
  let document: DailyDocument = { version: 1, date, samples: 0, components: {} };
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as DailyDocument;
      if (parsed.version === 1 && parsed.date === date && parsed.components) document = parsed;
    } catch {
      // A malformed daily aggregate is replaced instead of being trusted.
    }
  }
  applyChecksToDailyDocument(document, checks);
  await redisCommand(["SET", historyKey(date), JSON.stringify(document), "EX", 9_504_000]);
  return { stored: true, reason: "recorded" as const };
}

function daysEndingAt(now: Date, count = 90) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - (count - index - 1));
    return dateKey(day);
  });
}

export async function readStatusHistory(now = new Date()) {
  if (!redisConfiguration()) return { available: false, documents: [] as DailyDocument[] };
  const dates = daysEndingAt(now);
  const values = await redisCommand<Array<string | null>>(["MGET", ...dates.map(historyKey)]);
  const documents = (values ?? []).flatMap((value) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as DailyDocument;
      return parsed.version === 1 && parsed.components ? [parsed] : [];
    } catch {
      return [];
    }
  });
  return { available: true, documents };
}

export function summarizeHistory(componentId: string, documents: readonly DailyDocument[], now = new Date()) {
  const byDate = new Map(documents.map((document) => [document.date, document]));
  let operational = 0;
  let counted = 0;
  const points: HistoryPoint[] = daysEndingAt(now).map((date) => {
    const entry = byDate.get(date)?.components[componentId];
    if (!entry?.samples) return { date, state: "unknown" as const, uptimePercent: null, averageLatencyMs: null, samples: 0 };
    operational += entry.operational;
    counted += entry.samples;
    const uptimePercent = Number(((entry.operational / entry.samples) * 100).toFixed(3));
    let state: ServiceState = "operational";
    if (entry.outage > 0) state = "outage";
    else if (entry.degraded > 0) state = "degraded";
    return {
      date,
      state,
      uptimePercent,
      averageLatencyMs: entry.latencySamples ? Math.round(entry.latencyTotalMs / entry.latencySamples) : null,
      samples: entry.samples,
    };
  });
  return { points, uptimePercent: counted ? Number(((operational / counted) * 100).toFixed(3)) : null };
}
