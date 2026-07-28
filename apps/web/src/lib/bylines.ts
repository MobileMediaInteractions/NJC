import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { stories, users } from "@harborline/backend/schema";
import { initialsForByline } from "@/lib/pseudonyms";
import type { StoryBylineOption } from "@/lib/pseudonyms";

export type BylineMode = "account" | "pseudonym";
export type PublicBylineSnapshot = NonNullable<
  typeof stories.$inferSelect.publicBylineSnapshot
>;
type UserRecord = typeof users.$inferSelect;

export class BylineUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BylineUnavailableError";
  }
}

export function buildPublicBylineSnapshot(
  owner: UserRecord,
  mode: BylineMode,
): PublicBylineSnapshot {
  if (mode === "pseudonym") {
    if (!owner.pseudonym || !owner.pseudonymEnabled) {
      throw new BylineUnavailableError(
        "This author does not have an active saved pseudonym.",
      );
    }
    return {
      mode,
      name: owner.pseudonym,
      initials: initialsForByline(owner.pseudonym),
      role: "Courier contributor",
      pseudonymRevision: owner.pseudonymRevision,
    };
  }

  return {
    mode,
    name: owner.displayName,
    initials: initialsForByline(owner.displayName),
    role: owner.title || owner.role,
    ...(owner.avatarUrl ? { avatar: owner.avatarUrl } : {}),
    ...(owner.publicSlug && owner.publicProfilePublishedAt
      ? { profileSlug: owner.publicSlug }
      : {}),
  };
}

export async function getBylineOwner(authorId: string) {
  const [owner] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, authorId))
    .limit(1);
  return owner ?? null;
}

export async function resolvePublicByline(authorId: string, mode: BylineMode) {
  const owner = await getBylineOwner(authorId);
  if (!owner || !owner.isActive) {
    throw new BylineUnavailableError("The story owner is no longer available.");
  }
  return buildPublicBylineSnapshot(owner, mode);
}

export async function getStoryBylineOptions(
  authorId: string,
): Promise<StoryBylineOption[]> {
  const owner = await getBylineOwner(authorId);
  if (!owner) return [];
  return [
    { mode: "account", name: owner.displayName, available: owner.isActive },
    ...(owner.pseudonym
      ? [
          {
            mode: "pseudonym" as const,
            name: owner.pseudonym,
            available: owner.isActive && owner.pseudonymEnabled,
          },
        ]
      : []),
  ];
}

export function validateSavedPublicByline(
  owner: UserRecord,
  snapshot: PublicBylineSnapshot,
) {
  if (!owner.isActive) return false;
  if (snapshot.mode === "account") return true;
  return Boolean(
    owner.pseudonymEnabled &&
      owner.pseudonym &&
      snapshot.pseudonymRevision === owner.pseudonymRevision &&
      snapshot.name === owner.pseudonym,
  );
}
