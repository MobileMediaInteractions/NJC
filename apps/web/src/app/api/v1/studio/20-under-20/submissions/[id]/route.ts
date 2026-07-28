import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  apiAuditLogs,
  twentyUnderTwentyPrograms,
  twentyUnderTwentySubmissions,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import {
  canManageTwentyUnderTwenty,
  submissionReviewInput,
} from "@/lib/twenty-under-twenty";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required." } },
      { status: 401 },
    );
  }
  if (!canManageTwentyUnderTwenty(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Program review access is restricted." } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured." } },
      { status: 503 },
    );
  }

  const id = z.uuid().safeParse((await context.params).id);
  const parsed = submissionReviewInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!id.success || !parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the status and scoring fields." } },
      { status: 400 },
    );
  }

  try {
    const record = await getDb().transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(twentyUnderTwentySubmissions)
        .where(eq(twentyUnderTwentySubmissions.id, id.data))
        .limit(1);
      if (!current) return null;

      const [program] = await tx
        .select()
        .from(twentyUnderTwentyPrograms)
        .where(eq(twentyUnderTwentyPrograms.id, current.programId))
        .limit(1);
      if (!program) throw new Error("Program not found.");

      if (parsed.data.status === "selected" && current.status !== "selected") {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${program.id}))`,
        );
        const [selected] = await tx
          .select({ value: count() })
          .from(twentyUnderTwentySubmissions)
          .where(
            and(
              eq(twentyUnderTwentySubmissions.programId, program.id),
              eq(twentyUnderTwentySubmissions.status, "selected"),
              ne(twentyUnderTwentySubmissions.id, current.id),
            ),
          );
        if (Number(selected?.value ?? 0) >= program.classSize) {
          throw new SelectionLimitError(program.classSize);
        }
      }

      const publish = parsed.data.publish;
      if (publish && parsed.data.status !== "selected") {
        throw new PublishValidationError("Only selected honorees may be published.");
      }
      if (publish && !current.publicationConsent) {
        throw new PublishValidationError("Publication consent is required before public recognition.");
      }
      if (publish && !parsed.data.publicBio) {
        throw new PublishValidationError("Add an approved public bio before publishing.");
      }

      const honoreeSnapshot = publish
        ? {
            name: `${current.studentFirstName} ${current.studentLastName}`,
            school: current.school,
            city: current.city,
            county: current.county,
            bio: parsed.data.publicBio ?? "",
            ...(parsed.data.publicQuote ? { quote: parsed.data.publicQuote } : {}),
            ...(parsed.data.publicPhotoUrl ? { photoUrl: parsed.data.publicPhotoUrl } : {}),
          }
        : current.honoreeSnapshot;

      const [updated] = await tx
        .update(twentyUnderTwentySubmissions)
        .set({
          status: parsed.data.status,
          reviewScore: parsed.data.reviewScore,
          reviewRecommendation: parsed.data.reviewRecommendation,
          privateReviewNotes: parsed.data.privateReviewNotes,
          reviewedByClerkId: viewer.id,
          reviewedAt: new Date(),
          honoreeSnapshot,
          publishedAt: publish ? current.publishedAt ?? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(twentyUnderTwentySubmissions.id, current.id))
        .returning();
      await tx.insert(apiAuditLogs).values({
        actorClerkId: viewer.id,
        event: "twenty_under_twenty.submission_reviewed",
        metadata: {
          submissionId: current.id,
          programId: current.programId,
          from: current.status,
          to: parsed.data.status,
          published: publish,
        },
      });
      return updated;
    });
    if (!record) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Submission not found." } },
        { status: 404 },
      );
    }
    revalidatePath("/20-under-20");
    revalidatePath("/studio/20-under-20");
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
  } catch (error) {
    if (error instanceof SelectionLimitError || error instanceof PublishValidationError) {
      return NextResponse.json(
        { error: { code: error instanceof SelectionLimitError ? "class_full" : "publication_blocked", message: error.message } },
        { status: 409 },
      );
    }
    console.error("20 Under 20 submission review failed", error);
    return NextResponse.json(
      { error: { code: "update_failed", message: "The review could not be saved." } },
      { status: 500 },
    );
  }
}

class SelectionLimitError extends Error {
  constructor(limit: number) {
    super(`This class is limited to ${limit} selected honorees.`);
  }
}

class PublishValidationError extends Error {}
