import { NjcPlusContentEditor } from "@/components/studio/njc-plus-content-editor";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { getNjcPlusEditorOptions } from "@/lib/njc-plus-studio-options";
import { canPublishStory } from "@/lib/story-workflow";
import { getActivePlatformIntro } from "@/lib/njc-plus-preview";
export default async function NewContentPage() {
  const [viewer, options, platformIntro] = await Promise.all([getStudioUser(), getNjcPlusEditorOptions(), getActivePlatformIntro()]);
  return <><NjcPlusStudioHeading eyebrow="New production" title="Create NJC+ content" description="Start one authoritative record, then attach media, relationships, access policy and scheduling." /><NjcPlusContentEditor canPublish={Boolean(viewer && canPublishStory(viewer.role))} canManagePreviews={Boolean(viewer && ["admin", "editor", "producer"].includes(viewer.role))} options={options} platformIntro={platformIntro} /></>;
}
