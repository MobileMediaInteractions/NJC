import { NextResponse } from "next/server";
import { getPremiumContentBySlug, requiredFeatureForContent, resolveNjcPlusSurface, resolvePremiumAccess } from "@/lib/njc-plus";
import { getPlaybackPresentation } from "@/lib/njc-plus-preview";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const content = await getPremiumContentBySlug(slug);
  if (!content) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const surface = await resolveNjcPlusSurface({ feature: requiredFeatureForContent(content.kind) ?? undefined });
  if (!surface.available) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const access = await resolvePremiumAccess(content);
  const shared = {
    id: content.id,
    kind: content.kind,
    slug: content.slug,
    title: content.title,
    eyebrow: content.eyebrow,
    summary: content.summary,
    imageUrl: content.imageUrl,
    imageAlt: content.imageAlt,
    durationMs: content.durationMs,
    previewSeconds: content.previewSeconds,
    paywallPolicy: content.paywallPolicy,
    publishedAt: content.publishedAt,
    access,
  };
  if (!access.allowed) return NextResponse.json({ data: shared, meta: { apiVersion: "1", locked: true } }, { status: 200 });
  const presentation = await getPlaybackPresentation(content);
  return NextResponse.json({ data: { ...shared, body: content.body, mediaUrl: content.mediaUrl, mediaMimeType: content.mediaMimeType, captionsUrl: content.captionsUrl, transcript: content.transcript, authors: content.authors, speakers: content.speakers, tags: content.tags, relatedIds: content.relatedIds, timelineSegments: presentation.contentSegments, platformIntro: presentation.platformIntro }, meta: { apiVersion: "1", locked: false, sourceTimeline: true } });
}
