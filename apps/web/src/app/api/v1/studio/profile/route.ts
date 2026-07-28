import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { hasDatabase } from "@harborline/backend/db";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { staffProfileUpdateSchema } from "@/lib/staff-profile-policy";
import {
  getStaffProfileDraft,
  StaffProfilePublicationError,
  updateStaffProfileSettings,
} from "@/lib/staff-profiles";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    {
      error: {
        code: "service_not_configured",
        message: "The newsroom database is required to save a public profile",
      },
    },
    { status: 503 },
  );
}

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Studio access is required" } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) return unavailable();
  const profile = await getStaffProfileDraft(viewer.id);
  return NextResponse.json(
    { data: profile, meta: { apiVersion: "1" } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Studio access is required" } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) return unavailable();

  const parsed = staffProfileUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Review the public profile values",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  try {
    const previousProfile = await getStaffProfileDraft(viewer.id);
    const synchronized = await updateStaffProfileSettings({
      clerkId: viewer.id,
      title: parsed.data.title,
      bio: parsed.data.bio,
      publish:
        parsed.data.publishToStaffPage ??
        Boolean(previousProfile?.publicProfilePublishedAt),
    });
    if (!synchronized) {
      return NextResponse.json(
        {
          error: {
            code: "profile_unavailable",
            message: "The newsroom profile could not be found",
          },
        },
        { status: 404 },
      );
    }

    const wasPublished = Boolean(previousProfile?.publicProfilePublishedAt);
    const isPublished = Boolean(synchronized.publicProfilePublishedAt);
    await writeApiAudit({
      actorClerkId: viewer.id,
      event:
        wasPublished === isPublished
          ? "studio.public_profile_updated"
          : isPublished
            ? "studio.public_profile_published"
            : "studio.public_profile_unpublished",
      request,
      metadata: {
        published: isPublished,
        publicationRequested: parsed.data.publishToStaffPage,
        publicSlug: synchronized.publicSlug,
        biographyLength: synchronized.bio?.length ?? 0,
      },
    });

    revalidatePath("/staff");
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/sitemap.xml");
    if (synchronized.publicSlug) {
      revalidatePath(`/author/${synchronized.publicSlug}`);
    }

    return NextResponse.json(
      {
        data: await getStaffProfileDraft(viewer.id),
        meta: { apiVersion: "1" },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof StaffProfilePublicationError) {
      return NextResponse.json(
        {
          error: {
            code: "profile_incomplete",
            message: error.message,
            details: { formErrors: error.missingFields },
          },
        },
        { status: 400 },
      );
    }
    console.error("Studio public profile update failed", {
      actorId: viewer.id,
      error,
    });
    return NextResponse.json(
      {
        error: {
          code: "update_failed",
          message: "The public profile could not be saved",
        },
      },
      { status: 502 },
    );
  }
}
