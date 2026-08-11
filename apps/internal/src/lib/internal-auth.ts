import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeCapabilityGrants, users } from "@harborline/backend/schema";
import { verifyInternalPerimeter } from "@/lib/internal-boundary";

export type InternalViewer = {
  clerkId: string;
  email: string;
  displayName: string;
  role: string;
};

export type InternalEligibility = InternalViewer;

async function findActiveGrant(userId: string) {
  const [grant] = await getDb()
    .select({ id: employeeCapabilityGrants.id })
    .from(employeeCapabilityGrants)
    .where(and(
      eq(employeeCapabilityGrants.userClerkId, userId),
      eq(employeeCapabilityGrants.capability, "internal:access"),
      eq(employeeCapabilityGrants.effect, "allow"),
      isNull(employeeCapabilityGrants.revokedAt),
      or(isNull(employeeCapabilityGrants.expiresAt), gt(employeeCapabilityGrants.expiresAt, new Date())),
    ))
    .limit(1);
  return Boolean(grant);
}

export async function getInternalEligibility(headers: Headers): Promise<InternalEligibility | null> {
  const perimeter = await verifyInternalPerimeter(headers);
  if (!perimeter || !hasDatabase()) return null;

  const [account] = await getDb()
    .select({ clerkId: users.clerkId, email: users.email, displayName: users.displayName, role: users.role, isActive: users.isActive })
    .from(users)
    .where(sql`lower(${users.email}) = ${perimeter.email}`)
    .limit(1);
  if (!account?.isActive || !(await findActiveGrant(account.clerkId))) return null;
  return { clerkId: account.clerkId, email: account.email, displayName: account.displayName, role: account.role };
}

export async function getInternalViewer(headers: Headers, eligible?: InternalEligibility): Promise<InternalViewer | null> {
  const eligibility = eligible ?? await getInternalEligibility(headers);
  if (!eligibility) return null;

  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await currentUser();
  const verifiedEmail = clerkUser?.emailAddresses.find((item) => item.verification?.status === "verified")?.emailAddress.toLowerCase();
  if (!clerkUser || !verifiedEmail || userId !== eligibility.clerkId || verifiedEmail !== eligibility.email.toLowerCase()) return null;
  return eligibility;
}
