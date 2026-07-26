import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Radio, Sparkles } from "lucide-react";
import { PremiumCard } from "@/components/njc-plus/cards";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { filterPremiumContentByFlags, getPremiumHomepage, getPublishedPremiumContent, resolveNjcPlusSurface } from "@/lib/njc-plus";
import { njcPlusAssets } from "@/lib/njc-plus-assets";
import { redirectUnavailableNjcPlus } from "@/lib/njc-plus-routing";

export default async function NjcPlusHome({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const surface = await resolveNjcPlusSurface({ preview });
  if (!surface.available) redirectUnavailableNjcPlus();
  const [unfilteredContent, modules, membershipAvailable] = await Promise.all([
    getPublishedPremiumContent({ limit: 120, includeUnpublished: surface.studioPreview }),
    getPremiumHomepage(surface.studioPreview),
    isNjcPlusFeatureEnabled("njc_plus_paywalls"),
  ]);
  const content = surface.studioPreview
    ? unfilteredContent
    : await filterPremiumContentByFlags(unfilteredContent, { betaFeatureKeys: surface.betaFeatureKeys });
  const contentById = new Map(content.map((item) => [item.id, item]));
  const lead = modules.find((module) => ["lead", "live_now", "breaking_takeover"].includes(module.moduleType));
  const leadItem = lead?.contentIds.map((id) => contentById.get(id)).find(Boolean) ?? content.find((item) => item.isBreaking || item.isLive || item.isFeatured) ?? content[0];
  const editorialModules = modules.filter((module) => module.id !== lead?.id);

  return <>
    <NjcPlusHeader studioPreview={surface.studioPreview} />
    <main id="main-content">
      {leadItem ? <section className={`plus-hero ${leadItem.isBreaking ? "is-breaking" : ""}`}>
        {leadItem.imageUrl ? <Image src={leadItem.imageUrl} alt="" fill priority sizes="100vw" /> : <Image src={njcPlusAssets.signalField} alt="" fill priority sizes="100vw" />}
        <div className="plus-hero-shade" />
        <div className="plus-shell plus-hero-copy">
          <p>{leadItem.isLive ? <><Radio /> Live now</> : leadItem.isBreaking ? "Breaking coverage" : leadItem.eyebrow}</p>
          <h1>{leadItem.title}</h1>
          <span>{leadItem.summary}</span>
          <Link href={`/plus/${leadItem.slug}`}>{leadItem.kind === "article" || leadItem.kind === "story" ? "Read the report" : "Watch now"} <ArrowRight /></Link>
        </div>
      </section> : <EmptyLaunch studioPreview={surface.studioPreview} />}

      {editorialModules.length ? editorialModules.map((module) => {
        const items = module.contentIds.map((id) => contentById.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
        if (!items.length) return null;
        return <PremiumRail key={module.id} title={module.title || module.eyebrow || module.moduleType.replaceAll("_", " ")} items={items} spotlight={["investigation", "video_spotlight", "series", "podcast"].includes(module.moduleType)} />;
      }) : <AutomaticEditorial content={content.filter((item) => item.id !== leadItem?.id)} />}

      {surface.studioPreview || membershipAvailable ? <section className="plus-membership-promo">
        <Image src={njcPlusAssets.signalField} alt="" fill sizes="100vw" />
        <div className="plus-shell"><Sparkles /><p>NJC+ Founding Access</p><h2>Reporting that moves with New Jersey.</h2><span>Original investigations, films, shows, podcasts and live coverage—all in one member experience.</span><Link href={surface.studioPreview ? "/plus/join?preview=studio" : "/plus/join"}>See membership <ArrowRight /></Link></div>
      </section> : null}
    </main>
  </>;
}

function PremiumRail({ title, items, spotlight = false }: { title: string; items: NonNullable<Awaited<ReturnType<typeof getPublishedPremiumContent>>>; spotlight?: boolean }) {
  return <section className={spotlight ? "plus-section is-spotlight" : "plus-section"}><div className="plus-shell"><div className="plus-section-heading"><h2>{title}</h2><span>Curated by the NJC+ desk</span></div><div className={spotlight ? "plus-card-grid is-spotlight" : "plus-card-grid"}>{items.map((item, index) => <PremiumCard key={item.id} item={item} featured={spotlight && index === 0} />)}</div></div></section>;
}

function AutomaticEditorial({ content }: { content: Awaited<ReturnType<typeof getPublishedPremiumContent>> }) {
  if (!content.length) return null;
  const video = content.filter((item) => ["video", "show", "episode", "clip", "documentary", "investigation"].includes(item.kind));
  const sound = content.filter((item) => ["audio", "podcast", "podcast_episode"].includes(item.kind));
  const reading = content.filter((item) => ["story", "article", "breaking"].includes(item.kind));
  return <>{video.length ? <PremiumRail title="Watch the story unfold" items={video.slice(0, 7)} spotlight /> : null}{reading.length ? <PremiumRail title="Deep reads" items={reading.slice(0, 8)} /> : null}{sound.length ? <PremiumRail title="Listen closer" items={sound.slice(0, 8)} /> : null}</>;
}

function EmptyLaunch({ studioPreview }: { studioPreview: boolean }) {
  return <section className="plus-empty-hero"><Image src={njcPlusAssets.signalField} alt="" fill priority /><div className="plus-shell"><p>NJC+ Control Room</p><h1>{studioPreview ? "The signal is ready. Add the first production." : "NJC+ is preparing its first transmission."}</h1><span>No sample programming is shown in production. Studio controls every module and release.</span>{studioPreview ? <Link href="/studio/njc-plus/content">Create NJC+ content <ArrowRight /></Link> : null}</div></section>;
}
