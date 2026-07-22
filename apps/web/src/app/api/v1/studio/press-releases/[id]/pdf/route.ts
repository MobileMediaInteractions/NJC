import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressReleases } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { generatePressReleasePdf } from "@/lib/press-release-pdf";
import { pressReleaseFilename, pressReleaseInput, type PressReleaseRecord } from "@/lib/press-release";
import { getSiteConfiguration } from "@/lib/site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("tools:press");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press-release access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to generate this PDF" } }, { status: 503 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  const [release] = await getDb().select().from(pressReleases).where(eq(pressReleases.id, id)).limit(1);
  if (!release) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  const normalized = pressReleaseInput.safeParse({ ...release, releaseAt: release.releaseAt?.toISOString() ?? "" });
  if (!normalized.success) return NextResponse.json({ error: { code: "invalid_document", message: "This saved press release must be corrected before it can be exported" } }, { status: 409 });
  const { publication } = await getSiteConfiguration();
  const pdf = await generatePressReleasePdf({ ...release, ...normalized.data } as PressReleaseRecord, publication);
  await getDb().update(pressReleases).set({ lastExportedAt: new Date(), exportCount: sql`${pressReleases.exportCount} + 1` }).where(eq(pressReleases.id, id));
  await writeEmployeeAudit(request, viewer, "press_release.pdf_exported", { type: "press_release", id }, { bytes: pdf.byteLength, draft: release.status === "draft" });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pressReleaseFilename(release.headline)}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
