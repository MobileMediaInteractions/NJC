import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  apiAuditLogs,
  twentyUnderTwentyPrograms,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import {
  canConfigureTwentyUnderTwenty,
  programInput,
} from "@/lib/twenty-under-twenty";

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required." } },
      { status: 401 },
    );
  }
  if (!canConfigureTwentyUnderTwenty(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only administrators can configure program dates and public stages." } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured." } },
      { status: 503 },
    );
  }

  const parsed = programInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the program settings.", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { id, ...input } = parsed.data;
  const values = {
    ...input,
    nominationOpensAt: input.nominationOpensAt ? new Date(input.nominationOpensAt) : null,
    nominationClosesAt: input.nominationClosesAt ? new Date(input.nominationClosesAt) : null,
    applicationOpensAt: input.applicationOpensAt ? new Date(input.applicationOpensAt) : null,
    applicationClosesAt: input.applicationClosesAt ? new Date(input.applicationClosesAt) : null,
    eventAt: input.eventAt ? new Date(input.eventAt) : null,
    eventLocation: input.eventLocation || null,
    keynoteSpeaker: input.keynoteSpeaker || null,
    updatedByClerkId: viewer.id,
    updatedAt: new Date(),
  };

  try {
    const record = await getDb().transaction(async (tx) => {
      const rows = id
        ? await tx
            .update(twentyUnderTwentyPrograms)
            .set(values)
            .where(eq(twentyUnderTwentyPrograms.id, id))
            .returning()
        : await tx
            .insert(twentyUnderTwentyPrograms)
            .values({ ...values, createdByClerkId: viewer.id })
            .returning();
      if (!rows[0]) throw new Error("Program record was not found.");
      await tx.insert(apiAuditLogs).values({
        actorClerkId: viewer.id,
        event: id
          ? "twenty_under_twenty.program_updated"
          : "twenty_under_twenty.program_created",
        metadata: {
          programId: rows[0].id,
          year: rows[0].year,
          status: rows[0].status,
        },
      });
      return rows[0];
    });
    revalidatePath("/20-under-20");
    revalidatePath("/studio/20-under-20");
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: id ? 200 : 201 });
  } catch (error) {
    console.error("20 Under 20 program save failed", error);
    return NextResponse.json(
      { error: { code: "save_failed", message: "The program settings could not be saved." } },
      { status: 500 },
    );
  }
}
