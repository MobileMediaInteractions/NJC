import { asc } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { legalCenterEntries } from "@harborline/backend/schema";
import { LegalCenterManager } from "@/components/studio/legal-center-manager";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import { legalSeverityPolicy } from "@/lib/legal-center";

export const dynamic = "force-dynamic";

export default async function StudioLegalPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  if (!canManageSiteSettings(viewer.role)) {
    return (
      <StudioShell viewer={viewer}>
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Legal publishing access required</CardTitle>
            <CardDescription>
              Only administrators can draft, verify or publish Legal and Trust
              Center language.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }

  if (!hasDatabase()) {
    return (
      <StudioShell viewer={viewer}>
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Legal publishing unavailable</CardTitle>
            <CardDescription>
              Postgres must be connected before legal drafts or revisions can
              be managed.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }

  let entries: Array<typeof legalCenterEntries.$inferSelect>;
  try {
    entries = await getDb()
      .select()
      .from(legalCenterEntries)
      .orderBy(
        asc(legalCenterEntries.sortOrder),
        asc(legalCenterEntries.title),
      );
  } catch (error) {
    console.error("Studio legal registry lookup failed", {
      actorId: viewer.id,
      error,
    });
    return (
      <StudioShell viewer={viewer}>
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Legal registry could not be loaded</CardTitle>
            <CardDescription>
              No legal language was changed. Check the database migration and
              try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }

  return (
    <StudioShell viewer={viewer}>
      <LegalCenterManager
        viewerId={viewer.id}
        policy={legalSeverityPolicy}
        initialEntries={entries.map((entry) => ({
          ...entry,
          severity: entry.severity as
            | "informational"
            | "material"
            | "critical",
          status: entry.status as "draft" | "review" | "published",
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          reviewRequestedAt: entry.reviewRequestedAt?.toISOString() ?? null,
          publishedAt: entry.publishedAt?.toISOString() ?? null,
        }))}
      />
    </StudioShell>
  );
}

