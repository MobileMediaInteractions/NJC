import { NjcPlusSectionPage } from "@/components/njc-plus/section-page";
export default async function ListenPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  return <NjcPlusSectionPage title="Listen" intro="Podcasts, original audio and reporting you can take through the day." kinds={["audio", "podcast", "podcast_episode"]} feature={["njc_plus_audio", "njc_plus_podcasts"]} preview={(await searchParams).preview} />;
}
