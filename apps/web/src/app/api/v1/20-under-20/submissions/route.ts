import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  apiAuditLogs,
  twentyUnderTwentyPrograms,
  twentyUnderTwentySubmissions,
} from "@harborline/backend/schema";
import {
  createSubmissionReceipt,
  isIntakeOpen,
  isUnderAgeLimit,
  publicSubmissionInput,
} from "@/lib/twenty-under-twenty";
import { limitTwentyUnderTwentyIntake } from "@/lib/twenty-under-twenty-rate-limit";

export async function POST(request: Request) {
  const limit = await limitTwentyUnderTwentyIntake(request);
  if (!limit.success) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many submissions. Please try again later." } },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1_000))) } },
    );
  }

  const parsed = publicSubmissionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the required fields.", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "The program intake is not configured." } },
      { status: 503 },
    );
  }

  try {
    const [program] = await getDb()
      .select()
      .from(twentyUnderTwentyPrograms)
      .orderBy(desc(twentyUnderTwentyPrograms.year))
      .limit(1);
    if (!program || !isIntakeOpen(program, parsed.data.kind)) {
      return NextResponse.json(
        { error: { code: "intake_closed", message: "This submission window is not currently open." } },
        { status: 409 },
      );
    }
    if (!isUnderAgeLimit(parsed.data.birthDate, program.ageLimit)) {
      return NextResponse.json(
        { error: { code: "not_eligible", message: `The student must be under ${program.ageLimit} on the submission date.` } },
        { status: 400 },
      );
    }
    if (
      isUnderAgeLimit(parsed.data.birthDate, 18) &&
      (!parsed.data.guardianName || !parsed.data.guardianEmail)
    ) {
      return NextResponse.json(
        { error: { code: "guardian_required", message: "A parent or guardian name and email are required for students under 18." } },
        { status: 400 },
      );
    }

    const existing = await getDb()
      .select({ id: twentyUnderTwentySubmissions.id })
      .from(twentyUnderTwentySubmissions)
      .where(
        and(
          eq(twentyUnderTwentySubmissions.programId, program.id),
          eq(twentyUnderTwentySubmissions.kind, parsed.data.kind),
          eq(twentyUnderTwentySubmissions.studentEmail, parsed.data.studentEmail.toLowerCase()),
        ),
      )
      .limit(1);
    if (existing.length) {
      return NextResponse.json(
        { error: { code: "duplicate_submission", message: "A submission of this type already exists for this student and program year." } },
        { status: 409 },
      );
    }

    const receiptCode = createSubmissionReceipt();
    const value = parsed.data;
    const [submission] = await getDb().transaction(async (tx) => {
      const inserted = await tx
        .insert(twentyUnderTwentySubmissions)
        .values({
          programId: program.id,
          kind: value.kind,
          receiptCode,
          studentFirstName: value.studentFirstName,
          studentLastName: value.studentLastName,
          studentEmail: value.studentEmail.toLowerCase(),
          birthDate: value.birthDate,
          school: value.school,
          grade: value.grade,
          city: value.city,
          county: value.county,
          educatorName: value.educatorName || null,
          educatorEmail: value.educatorEmail?.toLowerCase() || null,
          educatorTitle: value.educatorTitle || null,
          relationship: value.relationship || null,
          communityImpact: value.communityImpact,
          serviceSummary: value.serviceSummary,
          futureGoals: value.futureGoals,
          supportingLinks: value.supportingLinks,
          guardianName: value.guardianName || null,
          guardianEmail: value.guardianEmail?.toLowerCase() || null,
          applicantAttested: value.applicantAttested,
          publicationConsent: value.publicationConsent,
          educatorAttested: value.educatorAttested,
        })
        .returning({
          id: twentyUnderTwentySubmissions.id,
          receiptCode: twentyUnderTwentySubmissions.receiptCode,
          submittedAt: twentyUnderTwentySubmissions.submittedAt,
        });
      await tx.insert(apiAuditLogs).values({
        event: "twenty_under_twenty.submitted",
        metadata: { programId: program.id, kind: value.kind, submissionId: inserted[0]?.id },
      });
      return inserted;
    });

    return NextResponse.json(
      { data: submission, meta: { apiVersion: "1", year: program.year } },
      { status: 201 },
    );
  } catch (error) {
    console.error("20 Under 20 intake failed", error);
    return NextResponse.json(
      { error: { code: "save_failed", message: "The submission could not be saved. Please try again." } },
      { status: 500 },
    );
  }
}
