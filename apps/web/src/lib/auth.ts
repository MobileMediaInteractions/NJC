import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import type { StaffRole, StudioUser } from "@/lib/types";

const validRoles: StaffRole[] = [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
];

export function resolveStaffRole(value: unknown): StaffRole | null {
  return validRoles.includes(value as StaffRole) ? (value as StaffRole) : null;
}

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export async function getStudioUser(): Promise<StudioUser | null> {
  if (!isClerkConfigured()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const role = resolveStaffRole(user.publicMetadata.role);
  if (!role) return null;

  const studioUser: StudioUser = {
    id: user.id,
    name:
      user.fullName ??
      user.username ??
      user.primaryEmailAddress?.emailAddress ??
      "Newsroom user",
    email: user.primaryEmailAddress?.emailAddress ?? "",
    role,
  };

  if (hasDatabase() && studioUser.email) {
    try {
      const [databaseUser] = await getDb()
        .insert(users)
        .values({
          clerkId: studioUser.id,
          email: studioUser.email,
          displayName: studioUser.name,
          role: studioUser.role,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: studioUser.email,
            displayName: studioUser.name,
            role: studioUser.role,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id });
      studioUser.databaseId = databaseUser?.id;
    } catch (error) {
      console.error("Newsroom identity synchronization failed", error);
    }
  }

  return studioUser;
}

export async function canPublish() {
  const user = await getStudioUser();
  return Boolean(user && ["admin", "editor", "producer"].includes(user.role));
}

export async function getAccountIdentity() {
  if (!isClerkConfigured()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  if (!user || !email || email.verification?.status !== "verified") return null;
  return { clerkId: user.id, email: email.emailAddress, name: user.fullName ?? email.emailAddress };
}

export async function getOptionalAccountId() {
  if (!isClerkConfigured()) return null;
  const { userId } = await auth();
  return userId ?? null;
}

export async function canUseMobileAdmin() {
  const user = await getStudioUser();
  return user && ["admin", "editor", "producer"].includes(user.role) ? user : null;
}
