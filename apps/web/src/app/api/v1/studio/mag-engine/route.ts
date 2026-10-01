import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, studioMagazines } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import { canUseMagEngine, magazineCreateInput, magazineSlug } from "@/lib/mag-engine";
import { writeApiAudit } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

async function authorize() {
  const viewer = await getStudioUser();
  if (!viewer || !canUseMagEngine(viewer.role)) return { response: NextResponse.json({ error: { code: "forbidden", message: "Editor, producer or administrator access is required" } }, { status: 403 }) };
  if (!(await getSiteConfiguration()).studio.modules.magEngine) return { response: NextResponse.json({ error: { code: "module_disabled", message: "MagEngine is disabled in Studio configuration" } }, { status: 404 }) };
  if (!hasDatabase()) return { response: NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to store magazine projects" } }, { status: 503 }) };
  return { viewer };
}

export async function GET() {
  const access = await authorize();
  if ("response" in access) return access.response;
  const issues = await getDb().select().from(studioMagazines).orderBy(desc(studioMagazines.updatedAt)).limit(200);
  return NextResponse.json({ data: issues, meta: { apiVersion: "1" } }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await authorize();
  if ("response" in access) return access.response;
  const parsed = magazineCreateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Enter a magazine title and check the imported file", details: parsed.error.flatten() } }, { status: 400 });
  const id = crypto.randomUUID();
  const sourceKind = parsed.data.sourcePathname ? "bookwright-pdf" : "composer";
  let sourceAssetId: string | null = null;
  if (parsed.data.sourcePathname) {
    if (!access.viewer.databaseId) return NextResponse.json({ error: { code: "identity_not_ready", message: "Your newsroom account is not synchronized to the media library yet" } }, { status: 409 });
    const [asset] = await getDb().select({ id: mediaAssets.id }).from(mediaAssets).where(and(
      eq(mediaAssets.pathname, parsed.data.sourcePathname),
      eq(mediaAssets.source, "studio-mag-engine"),
      eq(mediaAssets.visibility, "private"),
      eq(mediaAssets.mimeType, "application/pdf"),
      isNull(mediaAssets.deletedAt),
      eq(mediaAssets.uploadedById, access.viewer.databaseId),
    )).limit(1);
    if (!asset) {
      return NextResponse.json({ error: { code: "upload_not_found", message: "The uploaded magazine file is unavailable to this account" } }, { status: 404 });
    }
    sourceAssetId = asset.id;
  }
  const pages = parsed.data.pages ?? [];
  const imageIds = [...new Set(pages.flatMap((page) => page.imageAssetId ? [page.imageAssetId] : []))];
  if (imageIds.length) {
    const allowed = await getDb().select({ id: mediaAssets.id }).from(mediaAssets).where(and(inArray(mediaAssets.id, imageIds), eq(mediaAssets.visibility, "public"), ilike(mediaAssets.mimeType, "image/%"), isNull(mediaAssets.deletedAt)));
    if (allowed.length !== imageIds.length) return NextResponse.json({ error: { code: "invalid_image", message: "Choose images from the active public newsroom media library" } }, { status: 400 });
  }
  const [issue] = await getDb().insert(studioMagazines).values({
    id,
    title: parsed.data.title,
    slug: magazineSlug(parsed.data.title, id),
    description: parsed.data.description,
    sourceKind,
    sourceAssetId,
    pages,
    pageCount: pages.length,
    createdByClerkId: access.viewer.id,
    updatedByClerkId: access.viewer.id,
  }).returning();
  await writeApiAudit({ actorClerkId: access.viewer.id, event: "mag_engine.issue_created", request, metadata: { issueId: id, sourceKind, pageCount: pages.length } });
  return NextResponse.json({ data: issue, meta: { apiVersion: "1" } }, { status: 201 });
}
