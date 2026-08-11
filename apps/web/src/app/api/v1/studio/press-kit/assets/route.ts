import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { mediaAssets, pressAssets } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudioUser } from "@/lib/auth";
import { pressUsageClassifications } from "@/lib/press-kit-policy";
import { getPressAssetCatalog, writePressAudit } from "@/lib/press-kit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  mediaAssetId: z.uuid(),
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(1_000),
  category: z.string().trim().min(2).max(60),
  visibility: z.enum(["public", "restricted", "private"]),
  approvedUsageTypes: z.array(z.enum(pressUsageClassifications)).max(20),
  restrictions: z.array(z.string().trim().min(3).max(500)).max(20),
  attribution: z.string().trim().max(300).nullable().default(null),
  version: z.string().trim().min(1).max(40).default("1"),
});

const updateSchema = createSchema.omit({ mediaAssetId: true, slug: true }).partial().extend({
  id: z.uuid(),
  active: z.boolean().optional(),
  replacementAssetId: z.uuid().nullable().optional(),
});

async function viewer() {
  const account = await getStudioUser();
  return account && ["admin", "editor", "producer"].includes(account.role) ? account : null;
}

export async function GET() {
  const account = await viewer();
  if (!account) return NextResponse.json({ error: { code: "forbidden", message: "Press catalog access is required." } }, { status: 403 });
  return NextResponse.json({ assets: await getPressAssetCatalog({ includeInactive: true }) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const account = await viewer();
  if (!account || account.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required." } }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_asset", message: "Complete the press asset metadata.", details: parsed.error.flatten() } }, { status: 400 });
  const [media] = await getDb().select().from(mediaAssets).where(and(
    eq(mediaAssets.id, parsed.data.mediaAssetId),
    isNull(mediaAssets.deletedAt),
  )).limit(1);
  if (!media || media.processingStatus !== "ready") return NextResponse.json({ error: { code: "media_unavailable", message: "Choose a ready Media Library asset." } }, { status: 400 });
  if (!media.license) return NextResponse.json({ error: { code: "license_metadata_required", message: "The Media Library asset needs verified license metadata before it can enter the press catalog." } }, { status: 409 });
  try {
    const [created] = await getDb().insert(pressAssets).values({
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      sourceKind: "media_asset",
      sourcePath: null,
      mediaAssetId: media.id,
      mimeType: media.mimeType,
      version: parsed.data.version,
      checksumSha256: media.sha256,
      visibility: parsed.data.visibility,
      approvedUsageTypes: parsed.data.approvedUsageTypes,
      restrictions: parsed.data.restrictions,
      attribution: parsed.data.attribution,
      metadata: { originalFilename: media.filename },
      createdByClerkId: account.id,
      updatedByClerkId: account.id,
    }).returning();
    await writePressAudit({ request, actorType: "staff", actorId: account.id, action: "press_asset_created", metadata: { assetId: created.id, mediaAssetId: media.id } });
    return NextResponse.json({ asset: created }, { status: 201 });
  } catch (error) {
    console.error("Press catalog asset creation failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: { code: "asset_conflict", message: "That press asset could not be created. Its slug may already exist." } }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const account = await viewer();
  if (!account || account.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required." } }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_asset", message: "The press asset update is invalid.", details: parsed.error.flatten() } }, { status: 400 });
  const { id, ...values } = parsed.data;
  const [updated] = await getDb().update(pressAssets).set({ ...values, updatedByClerkId: account.id, updatedAt: new Date() })
    .where(eq(pressAssets.id, id)).returning();
  if (!updated) return NextResponse.json({ error: { code: "not_found", message: "Press asset not found." } }, { status: 404 });
  await writePressAudit({ request, actorType: "staff", actorId: account.id, action: "press_asset_updated", metadata: { assetId: id, fields: Object.keys(values) } });
  return NextResponse.json({ asset: updated });
}
