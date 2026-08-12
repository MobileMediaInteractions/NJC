import { courierDomain, managedDomainCatalog, type ManagedDomainLabel } from "@njcourier/domain-registry";

export type MonitorDefinition = {
  id: string;
  group: string;
  title: string;
  description: string;
  hostname: string;
  url: string | null;
  expectedStatuses: readonly number[];
  expectedBehavior: string;
  mode: "http" | "self" | "protected";
};

function domain(label: ManagedDomainLabel) {
  const entry = managedDomainCatalog.find((candidate) => candidate.label === label);
  if (!entry) throw new Error(`Unknown managed domain: ${label}`);
  return entry;
}

function host(label: ManagedDomainLabel) {
  return `${label}.${courierDomain}`;
}

function http(
  label: ManagedDomainLabel,
  group: string,
  options: { path?: string; expectedStatuses?: readonly number[]; expectedBehavior: string },
): MonitorDefinition {
  const entry = domain(label);
  const hostname = host(label);
  return {
    id: label,
    group,
    title: entry.title,
    description: entry.purpose,
    hostname,
    url: `https://${hostname}${options.path ?? "/"}`,
    expectedStatuses: options.expectedStatuses ?? [200],
    expectedBehavior: options.expectedBehavior,
    mode: "http",
  };
}

const redirected = [301, 302, 307, 308] as const;
const gated = [200, 301, 302, 307, 308, 401, 403] as const;

export const monitorCatalog: readonly MonitorDefinition[] = [
  {
    id: "apex",
    group: "Publication",
    title: "Courier apex domain",
    description: "The publication's root address and canonical redirect.",
    hostname: courierDomain,
    url: `https://${courierDomain}/`,
    expectedStatuses: redirected,
    expectedBehavior: "Redirects permanently to the canonical www publication",
    mode: "http",
  },
  http("www", "Publication", { expectedBehavior: "Returns the public front page" }),
  http("studio", "Newsroom & APIs", { expectedStatuses: gated, expectedBehavior: "Returns Studio or its authentication gate" }),
  http("api", "Newsroom & APIs", { expectedStatuses: gated, expectedBehavior: "Returns the protected API surface or its authentication gate" }),
  http("plus", "Products & Media", { expectedStatuses: [...gated, 404], expectedBehavior: "Returns NJC+ or its intentional availability gate" }),
  http("press", "Products & Media", { expectedStatuses: [...gated, 404], expectedBehavior: "Returns the Press & Media portal or its controlled launch gate" }),
  http("distribution", "Products & Media", { expectedStatuses: [...gated, 404], expectedBehavior: "Returns Distribution or a privacy-preserving access gate" }),
  http("cdn", "Delivery infrastructure", { path: "/assets/manifest.json", expectedBehavior: "Returns the immutable asset manifest" }),
  {
    id: "vercel-fallback",
    group: "Delivery infrastructure",
    title: "Vercel permanent origin",
    description: "The publication's provider-managed production fallback.",
    hostname: "njc-web.vercel.app",
    url: "https://njc-web.vercel.app/",
    expectedStatuses: [200, ...redirected],
    expectedBehavior: "Returns the production publication or canonical redirect",
    mode: "http",
  },
  http("links", "Products & Media", { expectedBehavior: "Returns the curated Link in Bio article page" }),
  http("support", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("careers", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("events", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("live", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("weather", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("newsletters", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("ads", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  http("account", "Reserved entry points", { expectedStatuses: redirected, expectedBehavior: "Redirects safely to the canonical publication until launch" }),
  {
    id: "int",
    group: "Protected infrastructure",
    title: domain("int").title,
    description: domain("int").purpose,
    hostname: host("int"),
    url: null,
    expectedStatuses: [],
    expectedBehavior: "Intentionally DNS-dark until its Access and mTLS perimeter is approved",
    mode: "protected",
  },
  {
    id: "status",
    group: "Status infrastructure",
    title: domain("status").title,
    description: domain("status").purpose,
    hostname: host("status"),
    url: null,
    expectedStatuses: [200],
    expectedBehavior: "Returns this independent status service",
    mode: "self",
  },
];
