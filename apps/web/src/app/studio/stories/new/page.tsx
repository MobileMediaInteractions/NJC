import { StoryEditor } from "@/components/studio/story-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import { canPublishStory } from "@/lib/story-workflow";

export default async function NewStoryPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const configuration = await getSiteConfiguration();
  return (
    <StudioShell viewer={viewer}>
      <StoryEditor
        datelines={configuration.editorial.datelines}
        publicationTimezone={configuration.publication.timezone}
        canPublish={canPublishStory(viewer.role)}
      />
    </StudioShell>
  );
}
