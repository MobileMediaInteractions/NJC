import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { distributionPlaybackProgress } from "@harborline/backend/schema";
import {
  getAuthorizedDistributionFile,
  getDistributionIdentity,
} from "@/lib/distribution";
import { distributionProgressInput } from "@/lib/distribution-input";

export async function PUT(request: Request) {
  const identity = await getDistributionIdentity();
  const parsed = distributionProgressInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!identity || !hasDatabase() || !parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Progress was not saved" } },
      { status: identity ? 400 : 401 },
    );
  }
  if (
    !(await getAuthorizedDistributionFile(identity.clerkId, parsed.data.fileId))
  ) {
    return NextResponse.json(
      { error: { code: "not_found", message: "File not found" } },
      { status: 404 },
    );
  }
  const [record] = await getDb()
    .insert(distributionPlaybackProgress)
    .values({ ...parsed.data, userClerkId: identity.clerkId })
    .onConflictDoUpdate({
      target: [
        distributionPlaybackProgress.userClerkId,
        distributionPlaybackProgress.fileId,
      ],
      set: {
        positionMs: parsed.data.positionMs,
        durationMs: parsed.data.durationMs,
        completed: parsed.data.completed,
        updatedAt: new Date(),
      },
    })
    .returning();
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
