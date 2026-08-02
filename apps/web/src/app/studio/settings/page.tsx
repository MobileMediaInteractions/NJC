import { SiteSettingsForm } from "@/components/studio/site-settings-form";
import { hasDatabase } from "@harborline/backend/db";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import { getSiteConfigurationRecord } from "@/lib/site-settings";
import { getSiteConfigurationHistory } from "@/lib/site-settings";

export default async function SettingsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const record = await getSiteConfigurationRecord();
  const history = await getSiteConfigurationHistory();
  return <StudioShell viewer={viewer}><SiteSettingsForm initialConfiguration={record.configuration} initialRevision={record.revision} history={history.map((row) => ({ revision: row.revision, reason: row.reason, environment: row.environment, affectedPlatforms: row.affectedPlatforms, changedByClerkId: row.changedByClerkId, rolledBackFromRevision: row.rolledBackFromRevision, createdAt: row.createdAt.toISOString() }))} operationalHealth={{ database: hasDatabase(), identity: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), scheduler: Boolean(process.env.CRON_SECRET), aiImages: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_WORKERS_AI_TOKEN && process.env.BLOB_READ_WRITE_TOKEN) }} canManage={canManageSiteSettings(viewer.role)} updatedAt={record.updatedAt?.toISOString() ?? null} /></StudioShell>;
}
