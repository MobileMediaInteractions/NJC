import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser, resolveStaffRole } from "@/lib/auth";
import { canChangeManagedRole, studioAccountUpdateSchema } from "@/lib/studio-account-policy";
import { getStudioAccount } from "@/lib/studio-accounts";

export const dynamic = "force-dynamic";

function adminRequired() {
  return NextResponse.json(
    { error: { code: "forbidden", message: "Administrator access is required to manage user accounts" } },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}

function isNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return adminRequired();
  const { id } = await context.params;
  try {
    const account = await getStudioAccount(id);
    return NextResponse.json(
      { data: account, meta: { apiVersion: "1" } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: { code: "not_found", message: "User account not found" } }, { status: 404 });
    }
    console.error("Studio user profile lookup failed", { targetId: id, error });
    return NextResponse.json({ error: { code: "lookup_failed", message: "The user profile could not be loaded" } }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return adminRequired();
  const { id } = await context.params;
  const parsed = studioAccountUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the profile values", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is required to keep newsroom access synchronized" } },
      { status: 503 },
    );
  }

  try {
    const client = await clerkClient();
    const target = await client.users.getUser(id);
    const currentRole = resolveStaffRole(target.publicMetadata.role);
    const nextRole = parsed.data.role;
    if (!canChangeManagedRole({ actorId: viewer.id, targetId: id, currentRole, nextRole })) {
      return NextResponse.json(
        { error: { code: "self_role_change_denied", message: "You cannot change your own administrator role from this screen" } },
        { status: 409 },
      );
    }

    const primaryEmail = target.primaryEmailAddress;
    if (nextRole && (!primaryEmail || primaryEmail.verification?.status !== "verified")) {
      return NextResponse.json(
        { error: { code: "verified_email_required", message: "A verified primary email is required before assigning newsroom access" } },
        { status: 400 },
      );
    }
    if (!primaryEmail && parsed.data.title) {
      return NextResponse.json(
        { error: { code: "email_required", message: "A primary email is required before saving a newsroom title" } },
        { status: 400 },
      );
    }
    let updated = target;
    if ((target.firstName ?? "") !== parsed.data.firstName || (target.lastName ?? "") !== parsed.data.lastName) {
      updated = await client.users.updateUser(id, {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      });
    }
    if (currentRole !== nextRole) {
      updated = await client.users.updateUserMetadata(id, {
        publicMetadata: { role: nextRole },
      });
    }

    const email = updated.primaryEmailAddress?.emailAddress ?? "";
    const name = updated.fullName ?? updated.username ?? (email || "Unnamed account");
    if (nextRole) {
      await getDb().insert(users).values({
        clerkId: updated.id,
        email,
        displayName: name,
        role: nextRole,
        title: parsed.data.title || null,
        avatarUrl: updated.imageUrl,
        isActive: true,
      }).onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email,
          displayName: name,
          role: nextRole,
          title: parsed.data.title || null,
          avatarUrl: updated.imageUrl,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else if (email) {
      await getDb().insert(users).values({
        clerkId: updated.id,
        email,
        displayName: name,
        role: currentRole ?? "contributor",
        title: parsed.data.title || null,
        avatarUrl: updated.imageUrl,
        isActive: false,
      }).onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email,
          displayName: name,
          title: parsed.data.title || null,
          avatarUrl: updated.imageUrl,
          isActive: false,
          updatedAt: new Date(),
        },
      });
    } else {
      await getDb().update(users).set({
        displayName: name,
        title: parsed.data.title || null,
        avatarUrl: updated.imageUrl,
        isActive: false,
        updatedAt: new Date(),
      }).where(eq(users.clerkId, id));
    }

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "studio.user_updated",
      request,
      metadata: {
        targetClerkId: id,
        previousRole: currentRole,
        nextRole,
        nameChanged: (target.firstName ?? "") !== parsed.data.firstName || (target.lastName ?? "") !== parsed.data.lastName,
        titleUpdated: true,
      },
    });
    revalidatePath("/studio/team");
    revalidatePath(`/studio/team/${id}`);
    const account = await getStudioAccount(id);
    return NextResponse.json(
      { data: account, meta: { apiVersion: "1" } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: { code: "not_found", message: "User account not found" } }, { status: 404 });
    }
    console.error("Studio user profile update failed", { actorId: viewer.id, targetId: id, error });
    return NextResponse.json({ error: { code: "update_failed", message: "The user profile could not be updated" } }, { status: 502 });
  }
}
