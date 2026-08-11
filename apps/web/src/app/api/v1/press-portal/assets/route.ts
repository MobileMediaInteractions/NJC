import { NextResponse } from "next/server";
import { getPressAssetCatalog, isPressPortalEnabled } from "@/lib/press-kit-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const catalog = await getPressAssetCatalog();
  return NextResponse.json({ assets: catalog.filter((asset) => asset.active && asset.visibility === "public").map((asset) => ({
    id: asset.id,
    slug: asset.slug,
    title: asset.title,
    description: asset.description,
    category: asset.category,
    mimeType: asset.mimeType,
    version: asset.version,
    attribution: asset.attribution,
  })) }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
