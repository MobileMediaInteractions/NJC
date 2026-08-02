import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { StoryEditor } from "@/components/studio/story-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import { canPublishStory } from "@/lib/story-workflow";
import { getStoryBylineOptions } from "@/lib/bylines";

const storyId = z.uuid();

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  const parsedId = storyId.safeParse((await params).id);
  if (!parsedId.success) notFound();
  if (!hasDatabase()) {
    return <StudioShell viewer={viewer}><StatusCard title="Story editor unavailable" description="The production database could not be reached. No editorial changes were made." /></StudioShell>;
  }

  let story: typeof stories.$inferSelect | undefined;
  try {
    [story] = await getDb().select().from(stories).where(eq(stories.id, parsedId.data)).limit(1);
  } catch (error) {
    console.error("Studio story edit lookup failed", { storyId: parsedId.data, error });
    return <StudioShell viewer={viewer}><StatusCard title="Story editor unavailable" description="The production database could not be reached. No editorial changes were made." /></StudioShell>;
  }
  if (!story) notFound();
  const configuration = await getSiteConfiguration();

  const canPublish = canPublishStory(viewer.role);
  const canEdit =
    canPublish ||
    Boolean(viewer.databaseId && story.authorId === viewer.databaseId);
  if (!canEdit) {
    return <StudioShell viewer={viewer}><StatusCard title="Editing access required" description="Only the story owner or a publisher can change this newsroom draft." /></StudioShell>;
  }
  const publishedEditingAllowed =
    story.status === "published" &&
    story.isActive &&
    configuration.studio.editorialWorkflow.activeStoryRevisions;
  if (
    story.status !== "draft" &&
    story.status !== "review" &&
    story.status !== "scheduled" &&
    !publishedEditingAllowed
  ) {
    return <StudioShell viewer={viewer}><StatusCard title="This story is final" description="Editing privileges were closed when this published story stopped being active." /></StudioShell>;
  }
  if (publishedEditingAllowed) {
    const [pendingRevision] = await getDb()
      .select({ id: storyRevisions.id })
      .from(storyRevisions)
      .where(and(
        eq(storyRevisions.storyId, story.id),
        eq(storyRevisions.reviewStatus, "pending"),
      ))
      .limit(1);
    if (pendingRevision) {
      return <StudioShell viewer={viewer}><StatusCard title="Update already awaiting approval" description="Review or reject the pending comparison before another live-story edit can be submitted." /></StudioShell>;
    }
  }
  const editorStatus = story.status as
    | "draft"
    | "review"
    | "scheduled"
    | "published";

  const bylineOptions = story.authorId
    ? await getStoryBylineOptions(story.authorId)
    : [{
        mode: "account" as const,
        name: story.authorSnapshot?.name ?? "Courier Newsroom",
        available: true,
      }];
  return (
    <StudioShell viewer={viewer}>
      <StoryEditor
        datelines={configuration.editorial.datelines}
        publicationTimezone={configuration.publication.timezone}
        bylineOptions={bylineOptions}
        pseudonymsEnabled={configuration.features.pseudonyms}
        richStoryEditorEnabled={configuration.studio.experience.richStoryEditor}
        richStoryEditorDefaultMode={configuration.studio.experience.richStoryEditorDefaultMode}
        aiImagePlaceholdersEnabled={configuration.studio.experience.aiImagePlaceholders}
        aiImageProviderConfigured={Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_WORKERS_AI_TOKEN && process.env.BLOB_READ_WRITE_TOKEN)}
        initialStory={{
          id: story.id,
          headline: story.headline,
          slug: story.slug,
          dek: story.dek,
          body: story.body,
          richBody: story.richBody as import("@harborline/contracts").StoryRichTextDocument | null,
          whyItMatters: story.whyItMatters,
          categorySlug: story.categorySlug,
          location: story.location,
          imageUrl: story.imageUrl,
          imageAlt: story.imageAlt,
          imageAssetId: story.imageAssetId,
          imageKind: story.imageKind as "editorial" | "ai_placeholder",
          tags: story.tags,
          seoTitle: story.seoTitle,
          seoDescription: story.seoDescription,
          canonicalUrl: story.canonicalUrl,
          noIndex: story.noIndex,
          isBreaking: story.isBreaking,
          bylineMode: story.publicBylineSnapshot?.mode ?? "account",
          status: editorStatus,
          scheduledAt: story.scheduledAt?.toISOString() ?? null,
          isActive: story.isActive,
        }}
      />
    </StudioShell>
  );
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>;
}
