import { auth, currentUser } from "@clerk/nextjs/server";
import type { StaffRole, StudioUser } from "@/lib/types";

const validRoles: StaffRole[] = [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
];

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export async function getStudioUser(): Promise<StudioUser | null> {
  if (
    process.env.CMS_DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return {
      id: "demo-admin",
      name: "Alex Morgan",
      email: "admin@harborline.local",
      role: "admin",
    };
  }

  if (!isClerkConfigured()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const metadataRole = user.publicMetadata.role;
  const role = validRoles.includes(metadataRole as StaffRole)
    ? (metadataRole as StaffRole)
    : "contributor";

  return {
    id: user.id,
    name:
      user.fullName ??
      user.username ??
      user.primaryEmailAddress?.emailAddress ??
      "Newsroom user",
    email: user.primaryEmailAddress?.emailAddress ?? "",
    role,
  };
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
