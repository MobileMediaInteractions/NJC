import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent } from "@harborline/backend/schema";
import { NjcPlusContentEditor } from "@/components/studio/njc-plus-content-editor";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { getNjcPlusEditorOptions } from "@/lib/njc-plus-studio-options";
import { canPublishStory } from "@/lib/story-workflow";
import { getActivePlatformIntro } from "@/lib/njc-plus-preview";
export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasDatabase()) notFound();
  const { id } = await params;
  const [viewer, record, options, platformIntro] = await Promise.all([
    getStudioUser(),
    getDb().select().from(premiumContent).where(eq(premiumContent.id, id)).limit(1),
    getNjcPlusEditorOptions(id),
    getActivePlatformIntro(),
  ]);
  if (!record[0]) notFound();
  return <><NjcPlusStudioHeading eyebrow={`${record[0].kind.replaceAll("_", " ")} · ${record[0].status}`} title={record[0].title} description={`Last edited ${record[0].updatedAt.toLocaleString()}. Server saves create revisions and audit history.`} /><NjcPlusContentEditor initial={record[0]} canPublish={Boolean(viewer && canPublishStory(viewer.role))} canManagePreviews={Boolean(viewer && ["admin", "editor", "producer"].includes(viewer.role))} options={options} platformIntro={platformIntro} /></>;
}
