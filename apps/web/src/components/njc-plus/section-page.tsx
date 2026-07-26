import { notFound } from "next/navigation";
import { PremiumCard } from "@/components/njc-plus/cards";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { filterPremiumContentByFlags, getPublishedPremiumContent, resolveNjcPlusSurface, type premiumContentKinds } from "@/lib/njc-plus";
import { isNjcPlusFeatureEnabled, type NjcPlusChildFlag } from "@/lib/feature-flags";
import { redirectUnavailableNjcPlus } from "@/lib/njc-plus-routing";

export async function NjcPlusSectionPage({ title, intro, kinds, feature, preview }: { title: string; intro: string; kinds: readonly (typeof premiumContentKinds)[number][]; feature: NjcPlusChildFlag | readonly NjcPlusChildFlag[]; preview?: string }) {
  const features = typeof feature === "string" ? [feature] : feature;
  const surface = await resolveNjcPlusSurface({ preview });
  const childAvailable = surface.studioPreview ||
    (await Promise.all(features.map(isNjcPlusFeatureEnabled))).some(Boolean) ||
    features.some((item) => surface.betaFeatureKeys.includes(item));
  if (!surface.available) redirectUnavailableNjcPlus();
  if (!childAvailable) notFound();
  const all = await getPublishedPremiumContent({ limit: 200, includeUnpublished: surface.studioPreview });
  const available = surface.studioPreview
    ? all
    : await filterPremiumContentByFlags(all, { betaFeatureKeys: surface.betaFeatureKeys });
  const items = available.filter((item) => kinds.includes(item.kind as never));
  return <><NjcPlusHeader studioPreview={surface.studioPreview} /><main className="plus-section-page"><header className="plus-shell"><p>NJC+ Signal</p><h1>{title}</h1><span>{intro}</span></header><section className="plus-shell">{items.length ? <div className="plus-card-grid">{items.map((item) => <PremiumCard key={item.id} item={item} />)}</div> : <div className="plus-empty-library"><h2>No programming is scheduled here yet.</h2><p>Studio can publish the first item without a deployment. NJC+ never substitutes demo content.</p></div>}</section></main></>;
}
