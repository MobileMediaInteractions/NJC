import "server-only";

import { and, asc, eq, isNotNull } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import {
  getAuthorProfileByName,
  getAuthorProfileBySlug,
  getAuthorProfilePaths,
  type AuthorProfile,
} from "@/lib/authors";
import {
  createStaffProfileSlug,
  getStaffProfileMissingFields,
  isStaffProfileComplete,
  isPublicStaffProfileVisible,
  shouldPublishStaffProfile,
} from "@/lib/staff-profile-policy";
import {
  normalizePseudonym,
  pseudonymConflictsWithNames,
} from "@/lib/pseudonyms";

type StaffRecord = typeof users.$inferSelect;

export type PublicStaffProfile = Omit<AuthorProfile, "title" | "avatarUrl"> & {
  clerkId: string | null;
  title: string | null;
  avatarUrl: string | null;
  publishedAt: string | null;
};

export type StaffProfileDraft = {
  displayName: string;
  title: string;
  bio: string;
  pseudonym: string;
  pseudonymEnabled: boolean;
  pseudonymRevision: number;
  publicSlug: string | null;
  publicProfilePublishedAt: string | null;
  avatarUrl: string | null;
};

function publicProfileFor(record: StaffRecord): PublicStaffProfile | null {
  if (!isPublicStaffProfileVisible(record)) {
    return null;
  }
  return {
    slug: record.publicSlug!,
    name: record.displayName,
    description: record.bio?.trim() ?? "",
    clerkId: record.clerkId,
    title: record.title,
    avatarUrl: record.avatarUrl,
    publishedAt: record.publicProfilePublishedAt!.toISOString(),
  };
}

function staticProfile(profile: AuthorProfile): PublicStaffProfile {
  return {
    ...profile,
    clerkId: null,
    title: profile.title ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    publishedAt: null,
  };
}

async function findUniqueSlug(record: StaffRecord) {
  const base = createStaffProfileSlug(record.displayName);
  const [collision] = await getDb()
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(eq(users.publicSlug, base))
    .limit(1);
  if (!collision || collision.clerkId === record.clerkId) return base;

  const suffix =
    record.clerkId.replace(/[^a-z0-9]/gi, "").slice(-8).toLocaleLowerCase("en-US") ||
    record.id.replaceAll("-", "").slice(-8);
  return `${base}-${suffix}`;
}

export class StaffProfilePublicationError extends Error {
  readonly missingFields: string[];

  constructor(missingFields: string[]) {
    super("Complete the required profile fields before publishing");
    this.name = "StaffProfilePublicationError";
    this.missingFields = missingFields;
  }
}

export class PseudonymConflictError extends Error {
  constructor() {
    super("Choose a pseudonym that is not already associated with another newsroom identity.");
    this.name = "PseudonymConflictError";
  }
}

export async function synchronizePublicStaffProfile(clerkId: string) {
  if (!hasDatabase()) return null;
  const [record] = await getDb()
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!record) return null;

  if (
    record.publicProfilePublishedAt &&
    (!record.isActive || !isStaffProfileComplete(record))
  ) {
    const [updated] = await getDb()
      .update(users)
      .set({
        publicProfilePublishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning();
    return updated ?? record;
  }

  if (!record.publicProfilePublishedAt) return record;

  const publicSlug = record.publicSlug ?? (await findUniqueSlug(record));
  const [updated] = await getDb()
    .update(users)
    .set({
      publicSlug,
      publicProfilePublishedAt: record.publicProfilePublishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkId))
    .returning();
  return updated ?? record;
}

export async function updateStaffProfileSettings(input: {
  clerkId: string;
  title: string;
  bio: string;
  pseudonym: string;
  publish: boolean;
}) {
  if (!hasDatabase()) return null;

  return getDb().transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(users)
      .where(eq(users.clerkId, input.clerkId))
      .limit(1);
    if (!record) return null;

    const proposed = {
      ...record,
      title: input.title || null,
      bio: input.bio || null,
      pseudonym: input.pseudonym.trim() || null,
    };
    const pseudonymNormalized = proposed.pseudonym
      ? normalizePseudonym(proposed.pseudonym)
      : null;
    if (proposed.pseudonym) {
      const staffNames = await tx
        .select({
          clerkId: users.clerkId,
          displayName: users.displayName,
          pseudonym: users.pseudonym,
        })
        .from(users)
        .where(eq(users.isActive, true));
      if (
        pseudonymConflictsWithNames(proposed.pseudonym, [
          "Abdullah Muzammil",
          ...staffNames.map((item) => item.displayName),
          ...staffNames
            .filter((item) => item.clerkId !== record.clerkId)
            .flatMap((item) => (item.pseudonym ? [item.pseudonym] : [])),
        ])
      ) {
        throw new PseudonymConflictError();
      }
    }
    const pseudonymChanged =
      pseudonymNormalized !== record.pseudonymNormalized ||
      proposed.pseudonym !== record.pseudonym;
    if (
      input.publish &&
      !shouldPublishStaffProfile({
        requested: true,
        isActive: proposed.isActive,
        displayName: proposed.displayName,
        title: proposed.title,
        bio: proposed.bio,
      })
    ) {
      const missingFields = getStaffProfileMissingFields(proposed);
      if (!proposed.isActive) {
        missingFields.unshift("active newsroom access");
      }
      throw new StaffProfilePublicationError(missingFields);
    }

    let publicSlug = record.publicSlug;
    if (input.publish && !publicSlug) {
      const base = createStaffProfileSlug(record.displayName);
      const [collision] = await tx
        .select({ clerkId: users.clerkId })
        .from(users)
        .where(eq(users.publicSlug, base))
        .limit(1);
      if (!collision || collision.clerkId === record.clerkId) {
        publicSlug = base;
      } else {
        const suffix =
          record.clerkId
            .replace(/[^a-z0-9]/gi, "")
            .slice(-8)
            .toLocaleLowerCase("en-US") ||
          record.id.replaceAll("-", "").slice(-8);
        publicSlug = `${base}-${suffix}`;
      }
    }

    const [updated] = await tx
      .update(users)
      .set({
        title: proposed.title,
        bio: proposed.bio,
        pseudonym: proposed.pseudonym,
        pseudonymNormalized,
        pseudonymRevision: pseudonymChanged
          ? record.pseudonymRevision + 1
          : record.pseudonymRevision,
        pseudonymUpdatedAt: pseudonymChanged ? new Date() : record.pseudonymUpdatedAt,
        publicSlug,
        publicProfilePublishedAt: input.publish
          ? record.publicProfilePublishedAt ?? new Date()
          : null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, input.clerkId))
      .returning();
    return updated ?? null;
  });
}

export async function getStaffProfileDraft(clerkId: string): Promise<StaffProfileDraft | null> {
  if (!hasDatabase()) return null;
  const [record] = await getDb()
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!record) return null;
  return {
    displayName: record.displayName,
    title: record.title ?? "",
    bio: record.bio ?? "",
    pseudonym: record.pseudonym ?? "",
    pseudonymEnabled: record.pseudonymEnabled,
    pseudonymRevision: record.pseudonymRevision,
    publicSlug: record.publicSlug,
    publicProfilePublishedAt:
      record.publicProfilePublishedAt?.toISOString() ?? null,
    avatarUrl: record.avatarUrl,
  };
}

export const listPublicStaffProfiles = cache(async function listPublicStaffProfiles(): Promise<PublicStaffProfile[]> {
  if (!hasDatabase()) return [];
  const records = await getDb()
    .select()
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        isNotNull(users.publicSlug),
        isNotNull(users.publicProfilePublishedAt),
      ),
    )
    .orderBy(asc(users.displayName));
  return records.flatMap((record) => {
    const profile = publicProfileFor(record);
    return profile ? [profile] : [];
  });
});

export async function hasPublicStaffProfiles() {
  return (await listPublicStaffProfiles()).length > 0;
}

export async function getPublicStaffProfileBySlug(slug: string) {
  if (hasDatabase()) {
    try {
      const [record] = await getDb()
        .select()
        .from(users)
        .where(eq(users.publicSlug, slug))
        .limit(1);
      const profile = record ? publicProfileFor(record) : null;
      if (profile) return profile;
    } catch (error) {
      console.error("Public staff profile lookup failed", { slug, error });
    }
  }
  const fallback = getAuthorProfileBySlug(slug);
  return fallback ? staticProfile(fallback) : undefined;
}

export async function getPublicStaffProfileByIdentity(input: {
  clerkId?: string;
  name: string;
}) {
  if (hasDatabase()) {
    try {
      const [record] = input.clerkId
        ? await getDb()
            .select()
            .from(users)
            .where(eq(users.clerkId, input.clerkId))
            .limit(1)
        : [];
      const profile = record ? publicProfileFor(record) : null;
      if (profile) return profile;
    } catch (error) {
      console.error("Public staff identity lookup failed", {
        clerkId: input.clerkId,
        error,
      });
    }
  }
  const fallback = getAuthorProfileByName(input.name);
  return fallback ? staticProfile(fallback) : undefined;
}

export async function getPublicStaffProfilePaths() {
  let databasePaths: string[] = [];
  try {
    databasePaths = (await listPublicStaffProfiles()).map(
      (profile) => `/author/${profile.slug}`,
    );
  } catch (error) {
    console.error("Public staff profile paths lookup failed", error);
  }
  return [...new Set([...getAuthorProfilePaths(), ...databasePaths])];
}
