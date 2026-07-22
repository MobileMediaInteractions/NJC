import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { hasDatabase } from "@harborline/backend/db";
import { writeApiAudit } from "@/lib/api-keys";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import {
  getSiteConfigurationRecord,
  normalizePublisherId,
  saveSiteConfiguration,
  siteConfigurationSchema,
} from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const record = await getSiteConfigurationRecord();
  return NextResponse.json({
    data: record.configuration,
    meta: {
      apiVersion: "1",
      canManage: canManageSiteSettings(viewer.role),
      updatedAt: record.updatedAt?.toISOString() ?? null,
      updatedByClerkId: record.updatedByClerkId,
    },
  });
}

export async function PATCH(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!canManageSiteSettings(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required to change site settings" } }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to save site settings" } }, { status: 503 });
  }

  const parsed = siteConfigurationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: {
        code: "invalid_request",
        message: "Review the highlighted configuration values",
        details: parsed.error.flatten(),
      },
    }, { status: 400 });
  }

  const configuration = {
    ...parsed.data,
    advertising: {
      ...parsed.data.advertising,
      publisherId: normalizePublisherId(parsed.data.advertising.publisherId),
    },
  };

  try {
    const record = await saveSiteConfiguration(configuration, viewer.id);
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "site.configuration_updated",
      request,
      metadata: {
        advertisingEnabled: configuration.advertising.enabled,
        advertisingPreviewMode: configuration.advertising.previewMode,
        autoAds: configuration.advertising.autoAds,
        enabledPlacements: Object.entries(configuration.advertising.placements)
          .filter(([, placement]) => placement.enabled)
          .map(([name]) => name),
      },
    });
    revalidatePath("/", "layout");
    revalidatePath("/api/v1/config");
    revalidatePath("/api/developer/v1/config");
    revalidatePath("/feed.xml");
    revalidatePath("/news-sitemap.xml");
    revalidatePath("/ads.txt");
    return NextResponse.json({
      data: configuration,
      meta: {
        apiVersion: "1",
        updatedAt: record.updatedAt.toISOString(),
        updatedByClerkId: record.updatedByClerkId,
      },
    });
  } catch (error) {
    console.error("Site configuration save failed", { actorId: viewer.id, error });
    return NextResponse.json({ error: { code: "save_failed", message: "The configuration could not be saved" } }, { status: 500 });
  }
}
