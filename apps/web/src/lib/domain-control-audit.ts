import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { employeeAuditLogs } from "@harborline/backend/schema";

// Commit a durable, one-use intent BEFORE contacting either provider. The lock
// serializes the check/insert across all Vercel instances without new tables.
export async function claimDomainProvisioning(input: { actor: string; hostname: string; challenge: string; reason: string }) {
  const challengeId = createHash("sha256").update(input.challenge).digest("hex");
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`domain-control:${input.hostname}`}))`);
    const [used] = await tx.select({ id: employeeAuditLogs.id }).from(employeeAuditLogs).where(and(
      eq(employeeAuditLogs.actorClerkId, input.actor),
      eq(employeeAuditLogs.action, "infrastructure.domain_provision_requested"),
      eq(employeeAuditLogs.targetId, input.hostname),
      sql`${employeeAuditLogs.metadata}->>'challengeId' = ${challengeId}`,
    )).limit(1);
    if (used) return false;
    // Different previews for one hostname must not race across instances.
    // Provider calls have 10s timeouts; this conservative two-minute lease also
    // forces a status reconciliation after a crash rather than a blind retry.
    const [recent] = await tx.select({ id: employeeAuditLogs.id }).from(employeeAuditLogs).where(and(
      eq(employeeAuditLogs.action, "infrastructure.domain_provision_requested"),
      eq(employeeAuditLogs.targetId, input.hostname),
      gt(employeeAuditLogs.createdAt, new Date(Date.now() - 120_000)),
    )).limit(1);
    if (recent) return false;
    await tx.insert(employeeAuditLogs).values({
      actorClerkId: input.actor, action: "infrastructure.domain_provision_requested",
      targetType: "hostname", targetId: input.hostname,
      metadata: { challengeId, reason: input.reason },
    });
    return true;
  });
}
