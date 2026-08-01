import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@harborline/backend/db";
import { writeApiAudit } from "@/lib/api-keys";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import {
  getSiteConfigurationRecord,
  normalizePublisherId,
  saveSiteConfiguration,
  siteConfigurationSchema,
  StaleSiteConfigurationError,
} from "@/lib/site-settings";
import { configurationImpact } from "@/lib/platform-feature-registry";

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
      revision: record.revision,
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

  const saveInput = z.object({
    configuration: siteConfigurationSchema,
    expectedRevision: z.number().int().nonnegative(),
    reason: z.string().trim().min(8).max(500),
    confirmation: z.string().optional(),
  });
  const parsed = saveInput.safeParse(await request.json().catch(() => null));
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
    ...parsed.data.configuration,
    advertising: {
      ...parsed.data.configuration.advertising,
      publisherId: normalizePublisherId(parsed.data.configuration.advertising.publisherId),
    },
  };

  try {
    const before = (await getSiteConfigurationRecord()).configuration;
    const impact = configurationImpact(before, configuration);
    const highImpactDisabled = impact.some((entry) => entry.defaultState === "enabled" && entry.configurationPath && entry.key.match(/pseudonym|scheduling|authorization|audit/));
    if (highImpactDisabled && parsed.data.confirmation !== "APPLY PRODUCTION CHANGE") {
      return NextResponse.json({ error: { code: "confirmation_required", message: "Type APPLY PRODUCTION CHANGE in the review screen for this high-impact change" } }, { status: 409 });
    }
    const affectedPlatforms = [...new Set(impact.flatMap((entry) => entry.platforms))];
    const record = await saveSiteConfiguration(configuration, viewer.id, { expectedRevision: parsed.data.expectedRevision, reason: parsed.data.reason, affectedPlatforms, affectedFeatures: impact.map((entry) => entry.key) });
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "site.configuration_updated",
      request,
      metadata: {
        googleAnalyticsEnabled: configuration.measurement.googleAnalytics.enabled,
        googleAnalyticsMeasurementIdConfigured: Boolean(
          configuration.measurement.googleAnalytics.measurementId,
        ),
        advertisingEnabled: configuration.advertising.enabled,
        advertisingPreviewMode: configuration.advertising.previewMode,
        autoAds: configuration.advertising.autoAds,
        enabledPlacements: Object.entries(configuration.advertising.placements)
          .filter(([, placement]) => placement.enabled)
          .map(([name]) => name),
        enabledStudioModules: Object.entries(configuration.studio.modules)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name),
        easterEggEnabled: configuration.easterEgg.enabled,
        studioExperience: configuration.studio.experience,
        notificationPolicy: configuration.studio.notifications,
        automations: configuration.studio.automations,
        configurationRevision: record.revision,
        reason: parsed.data.reason,
        affectedFeatureKeys: impact.map((entry) => entry.key),
        affectedPlatforms,
      },
    });
    revalidatePath("/", "layout");
    revalidatePath("/api/v1/config");
    revalidatePath("/api/developer/v1/config");
    revalidatePath("/feed.xml");
    revalidatePath("/news-sitemap.xml");
    revalidatePath("/ads.txt");
    revalidatePath("/studio", "layout");
    return NextResponse.json({
      data: configuration,
      meta: {
        apiVersion: "1",
        updatedAt: record.updatedAt.toISOString(),
        updatedByClerkId: record.updatedByClerkId,
        revision: record.revision,
      },
    });
  } catch (error) {
    if (error instanceof StaleSiteConfigurationError) {
      return NextResponse.json({ error: { code: "stale_configuration", message: error.message } }, { status: 409 });
    }
    console.error("Site configuration save failed", { actorId: viewer.id, error });
    return NextResponse.json({ error: { code: "save_failed", message: "The configuration could not be saved" } }, { status: 500 });
  }
}
