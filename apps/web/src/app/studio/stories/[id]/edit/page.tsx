import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
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

  const canPublish = canPublishStory(viewer.role);
  const canEdit =
    canPublish ||
    Boolean(viewer.databaseId && story.authorId === viewer.databaseId);
  if (!canEdit) {
    return <StudioShell viewer={viewer}><StatusCard title="Editing access required" description="Only the story owner or a publisher can change this newsroom draft." /></StudioShell>;
  }
  if (story.status !== "draft" && story.status !== "review") {
    return <StudioShell viewer={viewer}><StatusCard title="This story is locked" description="Published, scheduled and archived stories cannot be changed in the draft editor." /></StudioShell>;
  }

  const configuration = await getSiteConfiguration();
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
        canPublish={canPublish}
        bylineOptions={bylineOptions}
        pseudonymsEnabled={configuration.features.pseudonyms}
        initialStory={{
          id: story.id,
          headline: story.headline,
          slug: story.slug,
          dek: story.dek,
          body: story.body,
          whyItMatters: story.whyItMatters,
          categorySlug: story.categorySlug,
          location: story.location,
          imageUrl: story.imageUrl,
          imageAlt: story.imageAlt,
          tags: story.tags,
          seoTitle: story.seoTitle,
          seoDescription: story.seoDescription,
          canonicalUrl: story.canonicalUrl,
          noIndex: story.noIndex,
          isBreaking: story.isBreaking,
          bylineMode: story.publicBylineSnapshot?.mode ?? "account",
          status: story.status,
        }}
      />
    </StudioShell>
  );
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>;
}
