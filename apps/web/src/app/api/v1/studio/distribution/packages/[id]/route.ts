import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  distributionPackages,
} from "@harborline/backend/schema";
import {
  getDistributionManager,
  getDistributionPackageForManager,
  writeDistributionAudit,
} from "@/lib/distribution";
import { distributionPackageInput } from "@/lib/distribution-input";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getDistributionManager();
  if (!manager || !hasDatabase()) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  const id = (await context.params).id;
  const record = await getDistributionPackageForManager(id);
  if (!record) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Package not found" } },
      { status: 404 },
    );
  }
  const client = await clerkClient();
  const recipients = await Promise.all(
    record.grants.map((grant) =>
      client.users.getUser(grant.userClerkId).catch(() => null),
    ),
  );
  return NextResponse.json({
    data: {
      ...record,
      grants: record.grants.map((grant, index) => {
        const recipient = recipients[index];
        return {
          ...grant,
          recipient: {
            name:
              recipient?.fullName ??
              recipient?.username ??
              recipient?.primaryEmailAddress?.emailAddress ??
              "Unavailable account",
            email: recipient?.primaryEmailAddress?.emailAddress ?? null,
          },
        };
      }),
    },
    meta: { apiVersion: "1" },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
      { error: { code: "invalid_request", message: "Check the package details" } },
      { status: 400 },
    );
  }
  const id = (await context.params).id;
  const [record] = await getDb()
    .update(distributionPackages)
    .set({
      ...parsed.data,
      availableAt: parsed.data.availableAt
        ? new Date(parsed.data.availableAt)
        : null,
      embargoAt: parsed.data.embargoAt
        ? new Date(parsed.data.embargoAt)
        : null,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
      updatedByClerkId: manager.id,
      updatedAt: new Date(),
    })
    .where(eq(distributionPackages.id, id))
    .returning();
  if (!record) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Package not found" } },
      { status: 404 },
    );
  }
  await writeDistributionAudit({
    request,
    actorClerkId: manager.id,
    action: "package.updated",
    targetType: "distribution_package",
    targetId: record.id,
    metadata: { status: record.status },
  });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
