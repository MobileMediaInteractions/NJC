import { NjcPlusPlatformIntros } from "@/components/studio/njc-plus-platform-intros";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getNjcPlusEditorOptions } from "@/lib/njc-plus-studio-options";

export default async function PlatformIntrosPage() {
  const options = await getNjcPlusEditorOptions();
  return <><NjcPlusStudioHeading eyebrow="Original presentation" title="Platform intros" description="Select one global NJC+ ident. Eligible originals inherit it automatically and may opt out title by title." /><NjcPlusPlatformIntros media={options.media.filter((item) => item.metadata?.mimeType?.toString().startsWith("video/") && item.metadata?.visibility === "public")} /></>;
}
