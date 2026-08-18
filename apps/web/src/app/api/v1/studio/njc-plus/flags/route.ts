import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { featureFlags } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import {
  allNjcPlusFlags,
  describeNjcPlusFlag,
  getNjcPlusFlags,
  njcPlusChildFlags,
  njcPlusParentFlag,
} from "@/lib/feature-flags";
import { writePremiumAudit } from "@/lib/njc-plus";
import { withCourierCutDistributionMode, resolveCourierCutDistributionMode } from "@/lib/courier-cut-contract";

const input = z.object({
  flags: z.array(z.object({
    key: z.enum(allNjcPlusFlags),
    enabled: z.boolean(),
    configuration: z.record(z.string(), z.unknown()).default({}),
  })).min(1).max(allNjcPlusFlags.length),
});

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  return NextResponse.json({ data: await getNjcPlusFlags(), meta: { apiVersion: "1" } });
}

export async function PUT(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") {
    return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required to change release controls" } }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to save NJC+ release controls" } }, { status: 503 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Check the NJC+ feature controls", details: parsed.error.flatten() } }, { status: 400 });
  }
  const known = new Set(allNjcPlusFlags);
  if (parsed.data.flags.some((flag) => !known.has(flag.key))) {
    return NextResponse.json({ error: { code: "invalid_flag", message: "Unknown NJC+ feature flag" } }, { status: 400 });
  }

  const flags = parsed.data.flags.map((flag) => flag.key === "njc_plus_preview_club"
    ? { ...flag, configuration: withCourierCutDistributionMode(flag.configuration, resolveCourierCutDistributionMode(flag.configuration)) }
    : flag);

  await getDb().transaction(async (tx) => {
    for (const flag of flags) {
      await tx.insert(featureFlags).values({
        key: flag.key,
        parentKey: (njcPlusChildFlags as readonly string[]).includes(flag.key) ? njcPlusParentFlag : null,
        enabled: flag.enabled,
        description: describeNjcPlusFlag(flag.key),
        configuration: flag.configuration,
        updatedByClerkId: viewer.id,
      }).onConflictDoUpdate({
        target: featureFlags.key,
        set: {
          enabled: flag.enabled,
          configuration: flag.configuration,
          description: describeNjcPlusFlag(flag.key),
          updatedByClerkId: viewer.id,
          updatedAt: new Date(),
        },
      });
    }
  });
  await writePremiumAudit({
    request,
    actorClerkId: viewer.id,
    action: "feature_flags.updated",
    targetType: "product",
    targetId: "njc_plus",
    metadata: { flags: flags.map(({ key, enabled, configuration }) => ({ key, enabled, configuration })) },
  });
  revalidatePath("/", "layout");
  revalidatePath("/plus", "layout");
  revalidatePath("/plus/courier-cut");
  revalidatePath("/courier-cut", "layout");
  revalidatePath("/studio/njc-plus");
  return NextResponse.json({ data: await getNjcPlusFlags(), meta: { apiVersion: "1" } });
}
