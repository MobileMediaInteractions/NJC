import { NextResponse } from "next/server";
import { filterPremiumContentByFlags, getPublishedPremiumContent, resolveNjcPlusSurface } from "@/lib/njc-plus";

export async function GET(request: Request) {
  const surface = await resolveNjcPlusSurface();
  if (!surface.available) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const search = new URL(request.url).searchParams;
  const kind = search.get("kind")?.trim() || undefined;
  const data = await filterPremiumContentByFlags(
    await getPublishedPremiumContent({ kind, limit: Number(search.get("limit") ?? 50) }),
    { betaFeatureKeys: surface.betaFeatureKeys },
  );
  return NextResponse.json({
    data: data.map((item) => ({
      id: item.id,
      kind: item.kind,
      slug: item.slug,
      title: item.title,
      eyebrow: item.eyebrow,
      summary: item.summary,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      durationMs: item.durationMs,
      isLive: item.isLive,
      isBreaking: item.isBreaking,
      publishedAt: item.publishedAt,
      paywallPolicy: item.paywallPolicy,
    })),
    meta: { apiVersion: "1" },
  });
}
