import "server-only";

import { resolveCname } from "node:dns/promises";
import { z } from "zod";
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
});

export const domainProvisionSchema = z.object({
  action: z.literal("provision"),
  label: z.enum(provisionableLabels as [ManagedDomainLabel, ...ManagedDomainLabel[]]),
  challenge: z.string().min(40).max(2_000),
  confirmation: z.string().min(1).max(255),
  reason: z.string().trim().min(20).max(500),
});


export function isDomainControlOperator(clerkId: string) {
  const ids = (process.env.DOMAIN_CONTROL_OPERATOR_CLERK_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return ids.includes(clerkId);
}

export function getDomainControlReadiness(clerkId?: string) {
  const automatedDns = Boolean(
    process.env.IONOS_DNS_API_TOKEN && process.env.IONOS_DNS_ZONE_ID,
  );
  return {
    enabled: process.env.DOMAIN_CONTROL_ENABLED === "true",
    operator: Boolean(clerkId && isDomainControlOperator(clerkId)),
    database: Boolean(process.env.DATABASE_URL),
    challengeSecret: Boolean(process.env.DOMAIN_CONTROL_CHALLENGE_SECRET),
    vercel: Boolean(
      process.env.VERCEL_API_TOKEN &&
      process.env.VERCEL_PROJECT_ID &&
      process.env.VERCEL_TEAM_ID,
    ),
    automatedDns,
    fullyAutomated: Boolean(
      process.env.DOMAIN_CONTROL_ENABLED === "true" &&
      clerkId &&
      isDomainControlOperator(clerkId) &&
      process.env.DATABASE_URL &&
      process.env.DOMAIN_CONTROL_CHALLENGE_SECRET &&
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
  });
  const body = await response.json().catch(() => ({})) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Vercel returned ${response.status}`);
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
  const { teamId } = vercelConfiguration();
  const configuration = await vercelRequest<VercelDomainConfiguration>(
    `/v6/domains/${encodeURIComponent(hostname)}/config?teamId=${encodeURIComponent(teamId)}`,
  );
  return recommendedCnameValue(configuration);
}

type IonosRecord = {
  id?: string;
  properties?: { name?: string; type?: string; content?: string; enabled?: boolean };
};

function ionosConfiguration() {
  const token = process.env.IONOS_DNS_API_TOKEN;
  const zoneId = process.env.IONOS_DNS_ZONE_ID;
  if (!token || !zoneId) throw new Error("Automated IONOS DNS is not configured");
  const baseUrl = (process.env.IONOS_DNS_API_URL ?? "https://dns.de-fra.ionos.com").replace(/\/$/, "");
  return { token, zoneId, baseUrl };
}

async function ionosRequest<T>(path: string, init?: RequestInit) {
  const { token, baseUrl } = ionosConfiguration();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? `IONOS DNS returned ${response.status}`);
  return body;
}

export async function ensureIonosCname(label: string, target: string) {
  const { zoneId } = ionosConfiguration();
  const records = await ionosRequest<{ items?: IonosRecord[] }>(
    `/zones/${encodeURIComponent(zoneId)}/records?limit=1000`,
  );
  const existing = (records.items ?? []).find((record) =>
    record.properties?.name === label && record.properties?.type === "CNAME",
  );
  const normalizedTarget = target.replace(/\.$/, "");
  if (existing?.properties?.content?.replace(/\.$/, "") === normalizedTarget && existing.properties.enabled !== false) {
    return { changed: false, recordId: existing.id ?? null };
  }
  if (existing?.id) {
    await ionosRequest(`/zones/${encodeURIComponent(zoneId)}/records/${encodeURIComponent(existing.id)}`, {
      method: "PUT",
      body: JSON.stringify({ properties: { name: label, type: "CNAME", content: normalizedTarget, ttl: 300, enabled: true } }),
    });
    return { changed: true, recordId: existing.id };
  }
  const created = await ionosRequest<IonosRecord>(
    `/zones/${encodeURIComponent(zoneId)}/records`,
    { method: "POST", body: JSON.stringify({ properties: { name: label, type: "CNAME", content: normalizedTarget, ttl: 300, enabled: true } }) },
  );
  return { changed: true, recordId: created.id ?? null };
}

export async function inspectPublicCname(hostname: string) {
  try {
    const values = await resolveCname(hostname);
    return values.map((value) => value.replace(/\.$/, ""));
  } catch {
    return [];
  }
}
