import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { distributionPackages } from "@harborline/backend/schema";
import {
  getDistributionManager,
  writeDistributionAudit,
} from "@/lib/distribution";
import { distributionPackageInput } from "@/lib/distribution-input";

export async function GET() {
  const manager = await getDistributionManager();
  if (!manager || !hasDatabase()) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  const records = await getDb()
    .select()
    .from(distributionPackages)
    .orderBy(desc(distributionPackages.updatedAt));
  return NextResponse.json(
    { data: records, meta: { apiVersion: "1", count: records.length } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const manager = await getDistributionManager();
  const parsed = distributionPackageInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!manager || !hasDatabase()) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Check the package details",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const slugBase =
    parsed.data.title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "package";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const [record] = await getDb()
    .insert(distributionPackages)
    .values({
      ...parsed.data,
      slug,
      availableAt: parsed.data.availableAt
        ? new Date(parsed.data.availableAt)
        : null,
      embargoAt: parsed.data.embargoAt
        ? new Date(parsed.data.embargoAt)
        : null,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
      createdByClerkId: manager.id,
      updatedByClerkId: manager.id,
    })
    .returning();
  await writeDistributionAudit({
    request,
    actorClerkId: manager.id,
    action: "package.created",
    targetType: "distribution_package",
    targetId: record.id,
    metadata: { status: record.status },
  });
  return NextResponse.json(
    { data: record, meta: { apiVersion: "1" } },
    { status: 201 },
  );
}
