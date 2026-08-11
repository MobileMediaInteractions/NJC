import { NextResponse } from "next/server";
import { hasDatabase } from "@harborline/backend/db";
import {
  attachVercelProjectDomain,
  confirmationForHostname,
  createDomainProvisioningChallenge,
  domainPreviewSchema,
  domainProvisionSchema,
  ensureIonosCname,
  getDomainControlReadiness,
  getVercelRecommendedCname,
  hostnameForLabel,
  inspectPublicCname,
  isDomainControlOperator,
  isProvisioningBlocked,
  isTrustedDomainControlHost,
  listVercelProjectDomains,
  managedDomainCatalog,
  verifyDomainProvisioningChallenge,
} from "@/lib/domain-control";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

async function authorize(request: Request) {
  if (!isTrustedDomainControlHost(request.headers.get("host"))) {
    return { response: noStoreJson({ error: { code: "wrong_host", message: "Domain control is available only on the production Studio hostname" } }, 404) };
  }
  const viewer = await getEmployeeViewer();
  if (!viewer || viewer.role !== "admin" || !isDomainControlOperator(viewer.id)) {
    return { response: noStoreJson({ error: { code: "forbidden", message: "Explicit domain-control operator access is required" } }, 403) };
  }
  if (!hasDatabase()) {
    return { response: noStoreJson({ error: { code: "database_required", message: "Domain mutations require durable audit storage" } }, 503) };
  }
  return { viewer };
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if ("response" in access) return access.response;
  const readiness = getDomainControlReadiness(access.viewer.id);
  let attached = new Map<string, { verified: boolean | null }>();
  let providerError: string | null = null;
  if (readiness.vercel) {
    try {
      attached = new Map((await listVercelProjectDomains()).map((domain) => [
        domain.name ?? "",
        { verified: typeof domain.verified === "boolean" ? domain.verified : null },
      ]));
    } catch (error) {
      providerError = error instanceof Error ? error.message : "Vercel status could not be read";
    }
  }
  const domains = await Promise.all(managedDomainCatalog.map(async (entry) => {
    const hostname = hostnameForLabel(entry.label);
    return {
      ...entry,
      hostname,
      attached: entry.project === "cdn" ? null : attached.has(hostname),
      verified: attached.get(hostname)?.verified ?? null,
      cname: await inspectPublicCname(hostname),
      provisionable: !isProvisioningBlocked(entry.label),
    };
  }));
  return noStoreJson({ data: { domains, readiness, providerError } });
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if ("response" in access) return access.response;
  const body = await request.json().catch(() => null);
  const preview = domainPreviewSchema.safeParse(body);
  if (preview.success) {
    if (isProvisioningBlocked(preview.data.label)) {
      return noStoreJson({ error: { code: "blocked_domain", message: "This hostname requires a separate security or deployment workflow" } }, 409);
    }
    const readiness = getDomainControlReadiness(access.viewer.id);
    if (!readiness.enabled || !readiness.challengeSecret || !readiness.vercel) {
      return noStoreJson({ error: { code: "not_configured", message: "Domain control is locked until its server-side safety configuration is complete" } }, 503);
    }
    const hostname = hostnameForLabel(preview.data.label);
    return noStoreJson({
      data: {
        hostname,
        challenge: createDomainProvisioningChallenge(access.viewer.id, hostname),
        challengeExpiresInSeconds: 300,
        confirmation: confirmationForHostname(hostname),
        automatedDns: readiness.automatedDns,
        operations: ["Attach the exact hostname to the fixed NJC Vercel project", readiness.automatedDns ? "Create or reconcile its IONOS CNAME" : "Return the exact CNAME for a manual DNS change", "Write a durable administrator audit record"],
      },
    });
  }

  const parsed = domainProvisionSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: { code: "invalid_request", message: "Review the hostname, reason and confirmation", details: parsed.error.flatten() } }, 400);
  }
  const { label, challenge, confirmation, reason } = parsed.data;
  if (isProvisioningBlocked(label)) {
    return noStoreJson({ error: { code: "blocked_domain", message: "This hostname requires a separate security or deployment workflow" } }, 409);
  }
  const readiness = getDomainControlReadiness(access.viewer.id);
  if (!readiness.enabled || !readiness.challengeSecret || !readiness.vercel) {
    return noStoreJson({ error: { code: "not_configured", message: "Domain control is locked until its server-side safety configuration is complete" } }, 503);
  }
  const hostname = hostnameForLabel(label);
  if (confirmation !== confirmationForHostname(hostname)) {
    return noStoreJson({ error: { code: "confirmation_mismatch", message: `Type ${confirmationForHostname(hostname)} exactly` } }, 400);
  }
  if (!verifyDomainProvisioningChallenge(challenge, { actor: access.viewer.id, hostname })) {
    return noStoreJson({ error: { code: "challenge_invalid", message: "The provisioning preview expired or does not match this operator and hostname" } }, 409);
  }

  let domainAttached = false;
  let cnameTarget: string | null = null;
  let dnsChanged: boolean | null = null;
  try {
    await attachVercelProjectDomain(hostname);
    domainAttached = true;
    cnameTarget = await getVercelRecommendedCname(hostname);
    if (!cnameTarget) throw new Error("Vercel did not return a recommended CNAME target");
    if (readiness.automatedDns) {
      dnsChanged = (await ensureIonosCname(label, cnameTarget)).changed;
    }
    await writeEmployeeAudit(request, access.viewer, "infrastructure.domain_provisioned", { type: "hostname", id: hostname }, {
      reason,
      projectId: process.env.VERCEL_PROJECT_ID,
      domainAttached,
      dnsAutomated: readiness.automatedDns,
      dnsChanged,
      cnameTarget,
    });
    return noStoreJson({ data: { hostname, domainAttached, dnsAutomated: readiness.automatedDns, dnsChanged, cnameTarget, next: readiness.automatedDns ? "DNS propagation and TLS issuance are pending verification" : "Create the returned CNAME at the authoritative DNS provider" } }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Domain provisioning failed";
    await writeEmployeeAudit(request, access.viewer, "infrastructure.domain_provision_failed", { type: "hostname", id: hostname }, {
      reason,
      projectId: process.env.VERCEL_PROJECT_ID,
      domainAttached,
      dnsAutomated: readiness.automatedDns,
      dnsChanged,
      cnameTarget,
      error: message.slice(0, 300),
    }).catch((auditError) => console.error("Domain failure audit could not be saved", { hostname, auditError }));
    return noStoreJson({ error: { code: "provisioning_failed", message, partial: { domainAttached, dnsChanged, cnameTarget } } }, 502);
  }
}
