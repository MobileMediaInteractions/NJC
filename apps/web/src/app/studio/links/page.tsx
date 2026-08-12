import { asc, desc, eq } from "drizzle-orm";
import { Link2 } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { linkInBioEntries, stories } from "@harborline/backend/schema";
import { LinkInBioManager } from "@/components/studio/link-in-bio-manager";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import { canPublishStory } from "@/lib/story-workflow";

export const dynamic = "force-dynamic";

export default async function StudioLinksPage() {
  const viewer = await getEmployeeViewer();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!canPublishStory(viewer.role)) {
    return (
      <StudioShell viewer={viewer}>
        <Card>
          <CardHeader><CardTitle>Publisher access required</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">An administrator, editor, or producer must curate the public Link in Bio page.</CardContent>
        </Card>
      </StudioShell>
    );
  }
  if (!hasDatabase()) {
    return (
      <StudioShell viewer={viewer}>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Link2 /> Link in Bio unavailable</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Postgres must be connected before social article links can be curated.</CardContent>
        </Card>
      </StudioShell>
    );
  }

  const db = getDb();
  const [configuration, entries, publishedStories] = await Promise.all([
    getSiteConfiguration(),
    db
      .select({
        id: linkInBioEntries.id,
        slug: linkInBioEntries.slug,
        storyId: linkInBioEntries.storyId,
        displayTitle: linkInBioEntries.displayTitle,
        sortOrder: linkInBioEntries.sortOrder,
        isVisible: linkInBioEntries.isVisible,
        startsAt: linkInBioEntries.startsAt,
        endsAt: linkInBioEntries.endsAt,
        clickCount: linkInBioEntries.clickCount,
        lastClickedAt: linkInBioEntries.lastClickedAt,
        headline: stories.headline,
        dek: stories.dek,
        categoryLabel: stories.categoryLabel,
        imageUrl: stories.imageUrl,
        publishedAt: stories.publishedAt,
      })
      .from(linkInBioEntries)
      .innerJoin(stories, eq(linkInBioEntries.storyId, stories.id))
      .orderBy(asc(linkInBioEntries.sortOrder), desc(linkInBioEntries.updatedAt)),
    db
      .select({
        id: stories.id,
        slug: stories.slug,
        headline: stories.headline,
        categoryLabel: stories.categoryLabel,
        publishedAt: stories.publishedAt,
      })
      .from(stories)
      .where(eq(stories.status, "published"))
      .orderBy(desc(stories.publishedAt))
      .limit(250),
  ]);

  return (
    <StudioShell viewer={viewer}>
      <LinkInBioManager
        enabled={configuration.features.linkInBio}
        entries={entries.map((entry) => ({
          ...entry,
          startsAt: entry.startsAt?.toISOString() ?? null,
          endsAt: entry.endsAt?.toISOString() ?? null,
          lastClickedAt: entry.lastClickedAt?.toISOString() ?? null,
          publishedAt: entry.publishedAt?.toISOString() ?? null,
        }))}
        stories={publishedStories
          .filter((story) => story.publishedAt)
          .map((story) => ({ ...story, publishedAt: story.publishedAt!.toISOString() }))}
      />
    </StudioShell>
  );
}
