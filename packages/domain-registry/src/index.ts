export const courierDomain = "thejerseycourier.com";

export const managedDomainCatalog = [
  { label: "www", title: "Public publication", purpose: "Canonical reader website", project: "web", activation: "active" },
  { label: "studio", title: "Newsroom Studio", purpose: "Authenticated editorial operations", project: "web", activation: "active" },
  { label: "api", title: "Developer API", purpose: "Developer portal and versioned APIs", project: "web", activation: "active" },
  { label: "plus", title: "NJC+", purpose: "Premium content platform", project: "web", activation: "active" },
  { label: "cut", title: "The Courier Cut", purpose: "Invitation-only NJC+ early-access portal", project: "web", activation: "required" },
  { label: "cdn", title: "Asset CDN", purpose: "Immutable public brand and media assets", project: "cdn", activation: "active" },
  { label: "press", title: "Press & Media", purpose: "Press-kit intake and authorized delivery", project: "web", activation: "required" },
  { label: "distribution", title: "Distribution", purpose: "Authorized pre-publication file delivery", project: "web", activation: "required" },
  { label: "status", title: "Service status", purpose: "Independent availability and incident reporting", project: "status", activation: "required" },
  { label: "int", title: "Internal boundary", purpose: "Connection-gated internal operations", project: "internal", activation: "security-gated" },
  { label: "links", title: "Link in Bio", purpose: "Curated social article landing page and audited article redirects", project: "web", activation: "active" },
  { label: "support", title: "Reader support", purpose: "Future help and support center", project: "web", activation: "reserved" },
  { label: "careers", title: "Careers", purpose: "Future newsroom opportunities", project: "web", activation: "reserved" },
  { label: "events", title: "Events", purpose: "Future awards and community events", project: "web", activation: "reserved" },
  { label: "live", title: "Live coverage", purpose: "Future live coverage entry point", project: "web", activation: "reserved" },
  { label: "weather", title: "Weather", purpose: "Future standalone weather destination", project: "web", activation: "reserved" },
  { label: "newsletters", title: "Newsletters", purpose: "Future newsletter center", project: "web", activation: "reserved" },
  { label: "ads", title: "Advertising", purpose: "Future advertiser information and campaign intake", project: "web", activation: "reserved" },
  { label: "account", title: "Reader account", purpose: "Future account and membership center", project: "web", activation: "reserved" },
] as const;

export type ManagedDomain = (typeof managedDomainCatalog)[number];
export type ManagedDomainLabel = ManagedDomain["label"];

export function hostnameForLabel(label: ManagedDomainLabel) {
  return `${label}.${courierDomain}`;
}

export function isProvisioningBlocked(label: ManagedDomainLabel) {
  const entry = managedDomainCatalog.find((candidate) => candidate.label === label);
  return !entry || entry.project !== "web" || entry.activation === "active";
}
