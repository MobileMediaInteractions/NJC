export type ServiceState = "operational" | "degraded" | "outage" | "protected" | "unknown";

export type HistoryPoint = {
  date: string;
  state: ServiceState;
  uptimePercent: number | null;
  averageLatencyMs: number | null;
  samples: number;
};

export type ServiceSnapshot = {
  id: string;
  group: string;
  title: string;
  description: string;
  hostname: string;
  state: ServiceState;
  detail: string;
  latencyMs: number | null;
  checkedAt: string;
  expectedBehavior: string;
  history: HistoryPoint[];
  uptime90Days: number | null;
};

export type StatusPayload = {
  generatedAt: string;
  overall: Exclude<ServiceState, "protected" | "unknown"> | "unknown";
  overallLabel: string;
  counts: Record<ServiceState, number>;
  historyAvailable: boolean;
  services: ServiceSnapshot[];
};
