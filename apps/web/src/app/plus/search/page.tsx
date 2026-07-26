import { ilike, or, and, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent } from "@harborline/backend/schema";
import { PremiumCard } from "@/components/njc-plus/cards";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { filterPremiumContentByFlags, resolveNjcPlusSurface } from "@/lib/njc-plus";
import { redirectUnavailableNjcPlus } from "@/lib/njc-plus-routing";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; preview?: string }> }) {
  const { q = "", preview } = await searchParams;
  const surface = await resolveNjcPlusSurface({ preview, feature: "njc_plus_search" });
  if (!surface.available) redirectUnavailableNjcPlus();
  const query = q.trim().slice(0, 120);
  const matches = query && hasDatabase() ? await getDb().select().from(premiumContent).where(and(
    surface.studioPreview ? undefined : eq(premiumContent.status, "published"),
    or(ilike(premiumContent.title, `%${query}%`), ilike(premiumContent.summary, `%${query}%`), ilike(premiumContent.transcript, `%${query}%`)),
  )).limit(100) : [];
  const data = surface.studioPreview
    ? matches
    : await filterPremiumContentByFlags(matches, { betaFeatureKeys: surface.betaFeatureKeys });
  return <><NjcPlusHeader studioPreview={surface.studioPreview} /><main className="plus-search-page"><div className="plus-shell"><p>NJC+ Discovery</p><h1>Search the signal.</h1><form><input name="q" defaultValue={query} placeholder="Shows, investigations, topics…" aria-label="Search NJC+" /><button>Search</button></form>{query ? <h2>{data.length} result{data.length === 1 ? "" : "s"} for “{query}”</h2> : <span>Search original reporting, video, audio and complete transcripts.</span>}<div className="plus-card-grid">{data.map((item) => <PremiumCard key={item.id} item={item} />)}</div></div></main></>;
}
