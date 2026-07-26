import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumHomepageModules } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writePremiumAudit } from "@/lib/njc-plus";

const moduleTypes = ["lead", "live_now", "breaking_takeover", "investigation", "video_spotlight", "series", "podcast", "latest", "most_watched", "most_listened", "most_read", "shows", "upcoming", "editors_picks", "continue_watching", "continue_listening", "recommended", "trial_promotion"] as const;
const input = z.object({
  id: z.uuid().optional(),
  moduleType: z.enum(moduleTypes),
  title: z.string().trim().max(120).default(""),
  eyebrow: z.string().trim().max(80).default(""),
  contentIds: z.array(z.uuid()).max(50).default([]),
  configuration: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.number().int().min(0).max(1_000).default(0),
  enabled: z.boolean().default(true),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
});

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const data = hasDatabase() ? await getDb().select().from(premiumHomepageModules).orderBy(asc(premiumHomepageModules.sortOrder)) : [];
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "A publishing role is required to compose the NJC+ homepage" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the homepage module", details: parsed.error.flatten() } }, { status: 400 });
  const { id, startsAt, endsAt, ...fields } = parsed.data;
  const values = { ...fields, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null, updatedByClerkId: viewer.id, updatedAt: new Date() };
  const [record] = id ? await getDb().update(premiumHomepageModules).set(values).where(eq(premiumHomepageModules.id, id)).returning() : await getDb().insert(premiumHomepageModules).values(values).returning();
  if (!record) return NextResponse.json({ error: { code: "not_found", message: "Homepage module not found" } }, { status: 404 });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: "homepage_module.saved", targetType: "homepage_module", targetId: record.id, metadata: { type: record.moduleType, enabled: record.enabled } });
  revalidatePath("/plus");
  revalidatePath("/studio/njc-plus");
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: id ? 200 : 201 });
}
