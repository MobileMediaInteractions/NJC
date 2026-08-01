import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeApiAudit } from "@/lib/api-keys";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import { rollbackSiteConfiguration, StaleSiteConfigurationError } from "@/lib/site-settings";

const schema = z.object({ expectedRevision: z.number().int().nonnegative(), reason: z.string().trim().min(12).max(500), confirmation: z.literal("ROLL BACK CONFIGURATION") });

export async function POST(request: Request, context: { params: Promise<{ revision: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || !canManageSiteSettings(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required" } }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const revision = Number((await context.params).revision);
  if (!parsed.success || !Number.isInteger(revision) || revision < 1) return NextResponse.json({ error: { code: "invalid_request", message: "Confirm a valid rollback and provide an audit reason" } }, { status: 400 });
  try {
    const result = await rollbackSiteConfiguration({ revision, expectedRevision: parsed.data.expectedRevision, clerkId: viewer.id, reason: parsed.data.reason });
    await writeApiAudit({ actorClerkId: viewer.id, event: "site.configuration_rolled_back", request, metadata: { sourceRevision: revision, newRevision: result.revision, reason: parsed.data.reason } });
    revalidatePath("/", "layout"); revalidatePath("/studio", "layout");
    return NextResponse.json({ data: result.value, meta: { apiVersion: "1", revision: result.revision } });
  } catch (error) {
    if (error instanceof StaleSiteConfigurationError) return NextResponse.json({ error: { code: "stale_configuration", message: error.message } }, { status: 409 });
    return NextResponse.json({ error: { code: "rollback_failed", message: error instanceof Error ? error.message : "Rollback failed" } }, { status: 500 });
  }
}
