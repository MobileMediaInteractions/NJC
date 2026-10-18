import "server-only";

import { resolveCname } from "node:dns/promises";
import { z } from "zod";
import { hasDatabase } from "@harborline/backend/db";
import { getAccountIdentity } from "@/lib/auth";
import { isVerifiedDomainControlOwner } from "@/lib/domain-control-access";
import { allowedDomainDnsApi, planHostingCname, validateVercelCnameTarget, type HostingDnsRecord } from "@/lib/domain-dns-contract";
import {
  managedDomainCatalog,
  type ManagedDomainLabel,
} from "@/lib/domain-registry";

export { hostnameForLabel, isProvisioningBlocked, managedDomainCatalog } from "@/lib/domain-registry";
export type { ManagedDomain, ManagedDomainLabel } from "@/lib/domain-registry";
export {
  confirmationForHostname,
  createDomainProvisioningChallenge,
  domainChallengeLifetimeSeconds,
  isTrustedDomainControlHost,
  verifyDomainProvisioningChallenge,
} from "@/lib/domain-control-contract";

const provisionableLabels = managedDomainCatalog
  .filter((entry) => entry.project === "web" && entry.activation !== "active")
  .map((entry) => entry.label);

export const domainPreviewSchema = z.object({
  action: z.literal("preview"),
  label: z.enum(provisionableLabels as [ManagedDomainLabel, ...ManagedDomainLabel[]]),
}).strict();

export const domainProvisionSchema = z.object({
  action: z.literal("provision"),
  label: z.enum(provisionableLabels as [ManagedDomainLabel, ...ManagedDomainLabel[]]),
  challenge: z.string().min(40).max(2_000),
  confirmation: z.string().min(1).max(255),
  reason: z.string().trim().min(20).max(500),
}).strict();


export async function isDomainControlOperator(viewer: { id: string; role: string }) {
  if (viewer.role !== "admin") return false;
  const ids = (process.env.DOMAIN_CONTROL_OPERATOR_CLERK_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const identity = await getAccountIdentity();
  return Boolean(identity && isVerifiedDomainControlOwner({
    clerkId: viewer.id, identityClerkId: identity.clerkId,
    role: viewer.role, email: identity.email, emailVerified: true,
  }, ids));
}

export function getDomainControlReadiness(operator = false) {
  let dnsEndpointValid = false;
  try { allowedDomainDnsApi(process.env.IONOS_DNS_API_URL); dnsEndpointValid = true; } catch { /* Fail closed for legacy or unapproved endpoints. */ }
  const automatedDns = Boolean(
    process.env.IONOS_DNS_API_TOKEN && process.env.IONOS_DNS_ZONE_ID && dnsEndpointValid,
  );
  return {
    enabled: process.env.DOMAIN_CONTROL_ENABLED === "true",
    operator,
    database: hasDatabase(),
    challengeSecret: (process.env.DOMAIN_CONTROL_CHALLENGE_SECRET?.length ?? 0) >= 32,
    vercel: Boolean(
      process.env.VERCEL_API_TOKEN &&
      process.env.VERCEL_PROJECT_ID &&
      process.env.VERCEL_TEAM_ID,
    ),
    automatedDns,
    fullyAutomated: Boolean(
      process.env.DOMAIN_CONTROL_ENABLED === "true" &&
      operator &&
      hasDatabase() &&
      (process.env.DOMAIN_CONTROL_CHALLENGE_SECRET?.length ?? 0) >= 32 &&
      process.env.VERCEL_API_TOKEN &&
      process.env.VERCEL_PROJECT_ID &&
      process.env.VERCEL_TEAM_ID &&
      automatedDns,
    ),
  };
}

type VercelProjectDomain = {
  name?: string;
  verified?: boolean;
  verification?: Array<{ type?: string; domain?: string; value?: string; reason?: string }>;
};

type VercelDomainConfiguration = {
  configuredBy?: string | null;
  recommendedCNAME?: Array<{ rank?: number; value?: string }> | { rank?: number; value?: string } | string;
};

function vercelConfiguration() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId || !teamId) throw new Error("Vercel domain management is not configured");
  return { token, projectId, teamId };
}

async function vercelRequest<T>(path: string, init?: RequestInit) {
  const { token } = vercelConfiguration();
  const response = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  const body = await response.json().catch(() => ({})) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    throw new Error(`Vercel returned ${response.status}. Check the server-side token scope and fixed project configuration`);
  }
  return body;
}

export async function listVercelProjectDomains() {
  const { projectId, teamId } = vercelConfiguration();
  const result = await vercelRequest<{ domains?: VercelProjectDomain[] }>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains?teamId=${encodeURIComponent(teamId)}&limit=100`,
  );
  return result.domains ?? [];
}

export async function attachVercelProjectDomain(hostname: string) {
  if (!provisionableLabels.some((label) => hostname === `${label}.thejerseycourier.com`)) throw new Error("This hostname is not approved for generic provisioning");
  const { projectId, teamId } = vercelConfiguration();
  const existing = (await listVercelProjectDomains()).find((domain) => domain.name === hostname);
  if (existing) return existing;
  return vercelRequest<VercelProjectDomain>(
    `/v10/projects/${encodeURIComponent(projectId)}/domains?teamId=${encodeURIComponent(teamId)}`,
    { method: "POST", body: JSON.stringify({ name: hostname }) },
  );
}

function recommendedCnameValue(configuration: VercelDomainConfiguration) {
  const value = configuration.recommendedCNAME;
  if (typeof value === "string") return value.replace(/\.$/, "");
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry.value)
      .sort((left, right) => (left.rank ?? 100) - (right.rank ?? 100))[0]
      ?.value?.replace(/\.$/, "") ?? null;
  }
  return value?.value?.replace(/\.$/, "") ?? null;
}

export async function getVercelRecommendedCname(hostname: string) {
  const { teamId, projectId } = vercelConfiguration();
  const configuration = await vercelRequest<VercelDomainConfiguration>(
    `/v6/domains/${encodeURIComponent(hostname)}/config?teamId=${encodeURIComponent(teamId)}&projectIdOrName=${encodeURIComponent(projectId)}`,
  );
  return recommendedCnameValue(configuration);
}

function ionosConfiguration() {
  const token = process.env.IONOS_DNS_API_TOKEN;
  const zoneId = process.env.IONOS_DNS_ZONE_ID;
  if (!token || !zoneId) throw new Error("Automated IONOS DNS is not configured");
  const baseUrl = allowedDomainDnsApi(process.env.IONOS_DNS_API_URL);
  return { token, zoneId, baseUrl };
}

async function ionosRequest<T>(path: string, init?: RequestInit) {
  const { token, baseUrl } = ionosConfiguration();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "X-API-Key": token,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(`IONOS DNS returned ${response.status}. Check the configured DNS API, credentials and zone`);
  return body;
}

export async function ensureIonosCname(label: string, target: string) {
  if (!provisionableLabels.some((approved) => approved === label)) throw new Error("This hostname is not approved for generic provisioning");
  const { zoneId } = ionosConfiguration();
  const normalizedTarget = validateVercelCnameTarget(target);
  const zone = await ionosRequest<{ name?: string; records?: HostingDnsRecord[] }>(`/v1/zones/${encodeURIComponent(zoneId)}`);
  const plan = planHostingCname(zone, label, normalizedTarget);
  if (!plan.record) return { changed: false, recordId: plan.existingId };
  const created = await ionosRequest<HostingDnsRecord[]>(`/v1/zones/${encodeURIComponent(zoneId)}/records`, {
    method: "POST", body: JSON.stringify([plan.record]),
  });
  return { changed: true, recordId: created[0]?.id ?? null };
}

export async function inspectPublicCname(hostname: string) {
  try {
    const values = await resolveCname(hostname);
    return values.map((value) => value.replace(/\.$/, ""));
  } catch {
    return [];
  }
}
