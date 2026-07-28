import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  distributionPackageItems,
  distributionPackages,
  stories,
} from "@harborline/backend/schema";
import {
  getDistributionManager,
  writeDistributionAudit,
} from "@/lib/distribution";
import { z } from "zod";

const attachStoryInput = z.object({
  storyId: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2_000).default(""),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getDistributionManager();
  const parsed = attachStoryInput.safeParse(
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
      { error: { code: "invalid_request", message: "Choose an eligible story" } },
      { status: 400 },
    );
  }
  const packageId = (await context.params).id;
  const result = await getDb().transaction(async (transaction) => {
    const [[target], [story]] = await Promise.all([
      transaction
      .select({ id: distributionPackages.id })
      .from(distributionPackages)
      .where(eq(distributionPackages.id, packageId))
      .limit(1),
      transaction
      .select({
        id: stories.id,
        headline: stories.headline,
        dek: stories.dek,
        body: stories.body,
        categoryLabel: stories.categoryLabel,
        status: stories.status,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(
        and(
          eq(stories.id, parsed.data.storyId),
          inArray(stories.status, ["draft", "review", "scheduled"]),
        ),
      )
      .limit(1),
    ]);
    if (!target || !story) return null;
    const [item] = await transaction
      .insert(distributionPackageItems)
      .values({
        packageId,
        storyId: story.id,
        storySnapshot: {
          headline: story.headline,
          dek: story.dek,
          body: story.body,
          categoryLabel: story.categoryLabel,
          sourceUpdatedAt: story.updatedAt.toISOString(),
          capturedAt: new Date().toISOString(),
        },
        title: parsed.data.title || story.headline,
        description: parsed.data.description || story.dek,
      })
      .onConflictDoNothing()
      .returning();
    return { item, story };
  });
  if (!result) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Eligible story not found" } },
      { status: 404 },
    );
  }
  const { item, story } = result;
  if (!item) {
    return NextResponse.json(
      { error: { code: "already_attached", message: "That story is already in this package" } },
      { status: 409 },
    );
  }
  await writeDistributionAudit({
    request,
    actorClerkId: manager.id,
    action: "story.attached",
    targetType: "distribution_item",
    targetId: item.id,
    metadata: { packageId, storyId: story.id, storyStatus: story.status },
  });
  return NextResponse.json(
    { data: { ...item, story }, meta: { apiVersion: "1" } },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getDistributionManager();
  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!manager || !hasDatabase() || !itemId) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  const packageId = (await context.params).id;
  const [item] = await getDb()
    .delete(distributionPackageItems)
    .where(
      and(
        eq(distributionPackageItems.id, itemId),
        eq(distributionPackageItems.packageId, packageId),
      ),
    )
    .returning();
  if (!item) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Package item not found" } },
      { status: 404 },
    );
  }
  await writeDistributionAudit({
    request,
    actorClerkId: manager.id,
    action: "item.removed",
    targetType: "distribution_item",
    targetId: item.id,
    metadata: { packageId, fileId: item.fileId, storyId: item.storyId },
  });
  return NextResponse.json({
    data: { id: item.id, removed: true },
    meta: { apiVersion: "1" },
  });
}
