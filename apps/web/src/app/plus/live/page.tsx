import { NjcPlusSectionPage } from "@/components/njc-plus/section-page";
export default async function LivePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  return <NjcPlusSectionPage title="Live desk" intro="The most important New Jersey stories, unfolding with context in real time." kinds={["live", "breaking"]} feature="njc_plus_live" preview={(await searchParams).preview} />;
}
