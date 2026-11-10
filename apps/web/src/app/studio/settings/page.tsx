import { SiteSettingsForm } from "@/components/studio/site-settings-form";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import { and, eq, inArray } from "drizzle-orm";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import { getSiteConfigurationRecord } from "@/lib/site-settings";
import { getSiteConfigurationHistory } from "@/lib/site-settings";
import { siteDesignEnvironmentOverride } from "@/lib/site-design";
import { isDomainControlOperator } from "@/lib/domain-control";

export default async function SettingsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const record = await getSiteConfigurationRecord();
  const history = await getSiteConfigurationHistory();
  const canManageDomains = await isDomainControlOperator(viewer);
  const canManage = canManageSiteSettings(viewer.role);
  let publishers: Array<{ id: string; name: string; email: string; role: string }> = [];
  if (canManage && hasDatabase()) {
    try {
      publishers = await getDb().select({ id: users.id, name: users.displayName, email: users.email, role: users.role })
        .from(users).where(and(eq(users.isActive, true), inArray(users.role, ["admin", "editor", "producer"])))
        .orderBy(users.displayName);
    } catch (error) {
      console.error("Studio publisher lookup failed", error);
    }
  }
  return <StudioShell viewer={viewer}><SiteSettingsForm
    initialConfiguration={record.configuration}
    initialRevision={record.revision}
    history={history.map((row) => ({ revision: row.revision, reason: row.reason, environment: row.environment, affectedPlatforms: row.affectedPlatforms, changedByClerkId: row.changedByClerkId, rolledBackFromRevision: row.rolledBackFromRevision, createdAt: row.createdAt.toISOString() }))}
    operationalHealth={{ database: hasDatabase(), identity: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), scheduler: Boolean(process.env.CRON_SECRET), aiImages: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_WORKERS_AI_TOKEN && process.env.BLOB_READ_WRITE_TOKEN) }}
    environmentDesignOverride={siteDesignEnvironmentOverride()}
    canManage={canManage}
    publishers={publishers}
    canManageDomains={canManageDomains}
    updatedAt={record.updatedAt?.toISOString() ?? null}
  /></StudioShell>;
}
