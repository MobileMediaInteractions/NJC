import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, LockKeyhole, Play } from "lucide-react";
import { notFound } from "next/navigation";
import { PremiumCard } from "@/components/njc-plus/cards";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { NjcPlusComments } from "@/components/njc-plus/comments";
import { NjcPlusMediaPlayer } from "@/components/njc-plus/media-player";
import { isNjcPlusFeatureEnabled, isNjcPlusPublicEnabled } from "@/lib/feature-flags";
import { getPremiumContentBySlug, getPremiumContentConnections, getPremiumPlaybackProgress, premiumKindFormat, premiumKindLabel, requiredFeatureForContent, resolveNjcPlusSurface, resolvePremiumAccess } from "@/lib/njc-plus";
import { njcPlusBetaDisclosure } from "@/lib/njc-plus-beta-contract";
import { njcPlusAssets } from "@/lib/njc-plus-assets";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!(await isNjcPlusPublicEnabled())) return { robots: { index: false, follow: false } };
  const item = await getPremiumContentBySlug((await params).slug);
  if (!item) return {};
  return {
    title: item.seoTitle || item.title,
    description: item.seoDescription || item.summary,
    robots: { index: !item.noIndex, follow: !item.noIndex },
    openGraph: { type: item.mediaUrl?.startsWith("video") ? "video.other" : "article", title: item.seoTitle || item.title, description: item.seoDescription || item.summary, images: item.socialImageUrl || item.imageUrl ? [item.socialImageUrl || item.imageUrl!] : [njcPlusAssets.signalField] },
  };
}

export default async function PremiumDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const studioPreview = preview === "studio";
  const item = await getPremiumContentBySlug(slug, studioPreview);
  if (!item) notFound();
  const surface = await resolveNjcPlusSurface({ preview, feature: requiredFeatureForContent(item.kind) ?? undefined });
  if (!surface.available) notFound();
  const access = surface.studioPreview ? { allowed: true, signedIn: true } : await resolvePremiumAccess(item);
  const format = premiumKindFormat(item.kind);
  const commentsAvailable = item.commentsEnabled && (
    await isNjcPlusFeatureEnabled("njc_plus_comments") ||
    surface.betaFeatureKeys.includes("njc_plus_comments")
  );
  const progress = access.allowed && format !== "article" ? await getPremiumPlaybackProgress(item.id) : null;
  const connections = await getPremiumContentConnections(item, surface.studioPreview, surface.betaFeatureKeys);

  return <>
    <NjcPlusHeader studioPreview={surface.studioPreview} />
    <main className="plus-detail">
      <div className="plus-shell"><Link href={surface.studioPreview ? "/plus?preview=studio" : "/plus"} className="plus-back"><ArrowLeft /> Back to NJC+</Link></div>
      {format !== "article" && item.mediaUrl && access.allowed ? <div className="plus-shell"><NjcPlusMediaPlayer contentId={item.id} kind={format} src={item.mediaUrl} poster={item.imageUrl} captionsUrl={item.captionsUrl} title={item.title} initialPositionMs={progress?.positionMs ?? 0} /></div> : <div className="plus-detail-image">{item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt || ""} fill priority sizes="100vw" /> : <Image src={njcPlusAssets.signalField} alt="" fill priority sizes="100vw" />}</div>}
      <article className="plus-shell plus-story">
        <header><p>{item.isLive ? "Live" : premiumKindLabel(item.kind)} · {item.eyebrow}</p><h1>{item.title}</h1><span>{item.summary}</span><div>{item.publishedAt ? <small><CalendarDays /> {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(item.publishedAt)}</small> : null}{item.durationMs ? <small><Clock3 /> {Math.ceil(item.durationMs / 60_000)} min</small> : null}</div></header>
        {connections.previous || connections.next ? <nav className="plus-episode-nav" aria-label="Episode navigation">{connections.previous ? <Link href={`/plus/${connections.previous.slug}`}><ArrowLeft /><span><small>Previous</small>{connections.previous.title}</span></Link> : <span />}{connections.next ? <Link href={`/plus/${connections.next.slug}`}><span><small>Up next</small>{connections.next.title}</span><ArrowRight /></Link> : null}</nav> : null}
        {!access.allowed ? <Paywall signedIn={access.signedIn} previewSeconds={item.previewSeconds} /> : <>
          {format === "article" ? <div className="plus-prose">{item.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : item.body.length ? <div className="plus-prose plus-prose-support">{item.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : null}
          {item.transcript ? <details className="plus-transcript"><summary>Read transcript</summary><div>{item.transcript.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details> : null}
        </>}
        {access.allowed && commentsAvailable ? <NjcPlusComments contentId={item.id} /> : null}
      </article>
      {connections.related.length ? <section className="plus-shell plus-related"><div><p>Keep exploring</p><h2>Related on NJC+</h2></div><div className="plus-card-grid">{connections.related.map((related) => <PremiumCard key={related.id} item={related} />)}</div></section> : null}
    </main>
  </>;
}

function Paywall({ signedIn, previewSeconds }: { signedIn: boolean; previewSeconds: number }) {
  return <section className="plus-paywall"><LockKeyhole /><p>NJC+ Member Edition</p><h2>Go beyond the headline.</h2><span>{previewSeconds ? `A ${previewSeconds}-second preview is available in the player. ` : ""}Join NJC+ for the complete original report and the full premium archive.</span><Link href={signedIn ? "/plus/join" : "/sign-in"}>{signedIn ? "View access options" : "Sign in to continue"} <Play /></Link><small>{njcPlusBetaDisclosure}</small><small>Access is verified securely on the server for every request.</small></section>;
}
