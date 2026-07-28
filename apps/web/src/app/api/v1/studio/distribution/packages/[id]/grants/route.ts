import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  distributionGrants,
  distributionPackages,
} from "@harborline/backend/schema";
import {
  getDistributionManager,
  writeDistributionAudit,
} from "@/lib/distribution";
import { distributionGrantInput } from "@/lib/distribution-input";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getDistributionManager();
  const parsed = distributionGrantInput.safeParse(
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
      { error: { code: "invalid_request", message: "Check the access grant" } },
      { status: 400 },
    );
  }
  const packageId = (await context.params).id;
  const [[target], account] = await Promise.all([
    getDb()
      .select({ id: distributionPackages.id })
      .from(distributionPackages)
      .where(eq(distributionPackages.id, packageId))
      .limit(1),
    (await clerkClient()).users
      .getUser(parsed.data.userClerkId)
      .catch(() => null),
  ]);
  const verified = account?.emailAddresses.some(
    (email) => email.verification?.status === "verified",
  );
  if (!target || !account || !verified) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_recipient",
          message: "Choose an existing account with a verified email address",
        },
      },
      { status: 400 },
    );
  }
  const startsAt = parsed.data.startsAt
    ? new Date(parsed.data.startsAt)
    : new Date();
  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : null;
  if (expiresAt && expiresAt <= startsAt) {
    return NextResponse.json(
      { error: { code: "invalid_window", message: "Expiration must follow the start date" } },
      { status: 400 },
    );
  }
  const [record] = await getDb()
    .insert(distributionGrants)
    .values({
      packageId,
      userClerkId: account.id,
      grantedByClerkId: manager.id,
      startsAt,
      expiresAt,
      downloadAllowed: parsed.data.downloadAllowed,
    })
    .onConflictDoUpdate({
      target: [
        distributionGrants.packageId,
        distributionGrants.userClerkId,
      ],
      set: {
        grantedByClerkId: manager.id,
        startsAt,
        expiresAt,
        downloadAllowed: parsed.data.downloadAllowed,
        revokedAt: null,
        updatedAt: new Date(),
      },
    })
    .returning();
  await writeDistributionAudit({
    request,
    actorClerkId: manager.id,
    action: "grant.saved",
    targetType: "distribution_grant",
    targetId: record.id,
    metadata: {
      packageId,
      recipientClerkId: account.id,
      downloadAllowed: record.downloadAllowed,
    },
  });
  return NextResponse.json(
    {
      data: {
        ...record,
        recipient: {
          name:
            account.fullName ??
            account.username ??
            account.primaryEmailAddress?.emailAddress,
          email: account.primaryEmailAddress?.emailAddress,
        },
      },
      meta: { apiVersion: "1" },
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getDistributionManager();
  const grantId = new URL(request.url).searchParams.get("grantId");
  if (!manager || !hasDatabase() || !grantId) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  const packageId = (await context.params).id;
  const [record] = await getDb()
    .update(distributionGrants)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(distributionGrants.id, grantId),
        eq(distributionGrants.packageId, packageId),
      ),
    )
    .returning();
  if (!record) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Grant not found" } },
      { status: 404 },
    );
  }
  await writeDistributionAudit({
    request,
    actorClerkId: manager.id,
    action: "grant.revoked",
    targetType: "distribution_grant",
    targetId: record.id,
    metadata: { packageId, recipientClerkId: record.userClerkId },
  });
  return NextResponse.json({
    data: { id: record.id, revoked: true },
    meta: { apiVersion: "1" },
  });
}
