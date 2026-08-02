import { StoryEditor } from "@/components/studio/story-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getStoryBylineOptions } from "@/lib/bylines";

export default async function NewStoryPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const configuration = await getSiteConfiguration();
  const bylineOptions = viewer.databaseId
    ? await getStoryBylineOptions(viewer.databaseId)
    : [{ mode: "account" as const, name: viewer.name, available: true }];
  return (
    <StudioShell viewer={viewer}>
      <StoryEditor
        datelines={configuration.editorial.datelines}
        publicationTimezone={configuration.publication.timezone}
        bylineOptions={bylineOptions}
        pseudonymsEnabled={configuration.features.pseudonyms}
        richStoryEditorEnabled={configuration.studio.experience.richStoryEditor}
        richStoryEditorDefaultMode={configuration.studio.experience.richStoryEditorDefaultMode}
      />
    </StudioShell>
  );
}
