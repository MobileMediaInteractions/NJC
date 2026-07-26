import { NjcPlusSectionPage } from "@/components/njc-plus/section-page";
export default async function WatchPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  return <NjcPlusSectionPage title="Watch" intro="Original films, investigations, shows and field reports—made for the story, not the scroll." kinds={["video", "show", "episode", "clip", "series", "miniseries", "investigation", "documentary"]} feature="njc_plus_video" preview={(await searchParams).preview} />;
}
