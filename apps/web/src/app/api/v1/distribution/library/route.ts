import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { distributionUserLibrary } from "@harborline/backend/schema";
import {
  canAccessDistributionItem,
  getDistributionIdentity,
  writeDistributionAudit,
} from "@/lib/distribution";
import { distributionLibraryInput } from "@/lib/distribution-input";

export async function PUT(request: Request) {
  const identity = await getDistributionIdentity();
  const parsed = distributionLibraryInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!identity || !hasDatabase() || !parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Library update rejected" } },
      { status: identity ? 400 : 401 },
    );
  }
  if (!(await canAccessDistributionItem(identity.clerkId, parsed.data.itemId))) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Item not found" } },
      { status: 404 },
    );
  }
  const [record] = await getDb()
    .insert(distributionUserLibrary)
    .values({
      userClerkId: identity.clerkId,
      itemId: parsed.data.itemId,
      collection: parsed.data.collection,
      favorite: parsed.data.favorite,
    })
    .onConflictDoUpdate({
      target: [
        distributionUserLibrary.userClerkId,
        distributionUserLibrary.itemId,
      ],
      set: {
        collection: parsed.data.collection,
        favorite: parsed.data.favorite,
        updatedAt: new Date(),
      },
    })
    .returning();
  await writeDistributionAudit({
    request,
    actorClerkId: identity.clerkId,
    action: "library.organized",
    targetType: "distribution_item",
    targetId: parsed.data.itemId,
    metadata: {
      collection: parsed.data.collection,
      favorite: parsed.data.favorite,
    },
  });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}

export async function DELETE(request: Request) {
  const identity = await getDistributionIdentity();
  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!identity || !hasDatabase() || !itemId) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Library update rejected" } },
      { status: identity ? 400 : 401 },
    );
  }
  await getDb()
    .delete(distributionUserLibrary)
    .where(
      and(
        eq(distributionUserLibrary.userClerkId, identity.clerkId),
        eq(distributionUserLibrary.itemId, itemId),
      ),
    );
  return NextResponse.json({
    data: { itemId, removed: true },
    meta: { apiVersion: "1" },
  });
}
