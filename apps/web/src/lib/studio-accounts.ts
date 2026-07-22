import "server-only";

import { inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import { resolveStaffRole } from "@/lib/auth";
import type {
  StudioAccountPage,
  StudioAccountProfile,
  StudioAccountSummary,
} from "@/lib/studio-account-types";

type ClerkUser = Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>;
type DatabaseProfile = typeof users.$inferSelect;

function isoDate(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function displayName(user: ClerkUser) {
  return user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress ?? "Unnamed account";
}

function accountStatus(user: ClerkUser): StudioAccountSummary["status"] {
  if (user.banned) return "banned";
  if (user.locked) return "locked";
  return "active";
}

function summaryFor(user: ClerkUser, databaseProfile?: DatabaseProfile): StudioAccountSummary {
  return {
    id: user.id,
    displayName: displayName(user),
    primaryEmail: user.primaryEmailAddress?.emailAddress ?? null,
    imageUrl: user.imageUrl,
    role: resolveStaffRole(user.publicMetadata.role),
    title: databaseProfile?.title ?? null,
    status: accountStatus(user),
    emailVerified: user.primaryEmailAddress?.verification?.status === "verified",
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: new Date(user.createdAt).toISOString(),
    lastActiveAt: isoDate(user.lastActiveAt),
  };
}

async function databaseProfiles(clerkIds: string[]) {
  if (!hasDatabase() || clerkIds.length === 0) return new Map<string, DatabaseProfile>();
  try {
    const records = await getDb().select().from(users).where(inArray(users.clerkId, clerkIds));
    return new Map(records.map((record) => [record.clerkId, record]));
  } catch (error) {
    console.error("Studio account database profiles lookup failed", error);
    return new Map<string, DatabaseProfile>();
  }
}

export async function listStudioAccounts(input: { query?: string; page?: number; pageSize?: number } = {}): Promise<StudioAccountPage> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const response = await (await clerkClient()).users.getUserList({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    orderBy: "-last_active_at",
    query: input.query?.trim() || undefined,
  });
  const profiles = await databaseProfiles(response.data.map((user) => user.id));
  return {
    accounts: response.data.map((user) => summaryFor(user, profiles.get(user.id))),
    totalCount: response.totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(response.totalCount / pageSize)),
  };
}

export async function getStudioAccount(clerkId: string): Promise<StudioAccountProfile> {
  const user = await (await clerkClient()).users.getUser(clerkId);
  const profiles = await databaseProfiles([clerkId]);
  const databaseProfile = profiles.get(clerkId);
  return {
    ...summaryFor(user, databaseProfile),
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    username: user.username,
    externalId: user.externalId,
    locale: user.locale,
    passwordEnabled: user.passwordEnabled,
    totpEnabled: user.totpEnabled,
    backupCodeEnabled: user.backupCodeEnabled,
    legalAcceptedAt: isoDate(user.legalAcceptedAt),
    lastSignInAt: isoDate(user.lastSignInAt),
    updatedAt: new Date(user.updatedAt).toISOString(),
    emails: user.emailAddresses.map((email) => ({
      id: email.id,
      address: email.emailAddress,
      primary: email.id === user.primaryEmailAddressId,
      verificationStatus: email.verification?.status ?? "unverified",
      verificationStrategy: email.verification?.strategy ?? null,
    })),
    phoneNumbers: user.phoneNumbers.map((phone) => ({
      id: phone.id,
      number: phone.phoneNumber,
      primary: phone.id === user.primaryPhoneNumberId,
      verificationStatus: phone.verification?.status ?? "unverified",
      reservedForSecondFactor: phone.reservedForSecondFactor,
    })),
    externalAccounts: user.externalAccounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      emailAddress: account.emailAddress,
      username: account.username,
      verificationStatus: account.verification?.status ?? "unverified",
    })),
    databaseProfile: databaseProfile ? {
      id: databaseProfile.id,
      isActive: databaseProfile.isActive,
      createdAt: databaseProfile.createdAt.toISOString(),
      updatedAt: databaseProfile.updatedAt.toISOString(),
    } : null,
  };
}
