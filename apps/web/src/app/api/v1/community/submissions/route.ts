import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityEventSubmissions } from "@harborline/backend/schema";
import { communityEventSubmissionInput } from "@/lib/community";
import { limitCommunityIntake } from "@/lib/community-rate-limit";
import { getSiteConfiguration } from "@/lib/site-settings";

export async function POST(request: Request) {
  if (!(await getSiteConfiguration()).features.community) {
    return NextResponse.json({ error: { code: "feature_disabled", message: "Community event submissions are currently unavailable." } }, { status: 404 });
  }
  const limit = await limitCommunityIntake(request);
  if (!limit.success) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many event submissions. Please try again later." } },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1_000))) } },
    );
  }

  const parsed = communityEventSubmissionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the event details and try again.", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  if (parsed.data.website) {
    return NextResponse.json({ data: { received: true }, meta: { apiVersion: "1" } }, { status: 202 });
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Community event intake is temporarily unavailable." } },
      { status: 503 },
    );
  }

  try {
    const value = parsed.data;
    const [submission] = await getDb().insert(communityEventSubmissions).values({
      title: value.title,
      category: value.category,
      description: value.description,
      startsAt: value.startsAt ? new Date(value.startsAt) : null,
      venue: value.venue || null,
      city: value.city || null,
      organizer: value.organizer || null,
      externalUrl: value.externalUrl || null,
      submitterName: value.submitterName,
      submitterEmail: value.submitterEmail.toLowerCase(),
      status: "pending",
    }).returning({ id: communityEventSubmissions.id });
    if (!submission) throw new Error("Community submission returned no record");
    return NextResponse.json({ data: { received: true }, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    console.error("Community event intake failed", error);
    return NextResponse.json(
      { error: { code: "save_failed", message: "The event could not be submitted. Please try again." } },
      { status: 500 },
    );
  }
}
