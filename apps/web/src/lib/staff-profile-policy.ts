import { z } from "zod";

export const staffBiographyMinimumLength = 80;
export const staffBiographyMaximumLength = 2_000;

export const staffProfileUpdateSchema = z.object({
  title: z.string().trim().max(120),
  bio: z.string().trim().max(staffBiographyMaximumLength),
  publishToStaffPage: z.boolean().optional(),
});

export type StaffProfileUpdate = z.infer<typeof staffProfileUpdateSchema>;

export function createStaffProfileSlug(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return slug || "courier-staff";
}

export function getStaffProfileMissingFields(input: {
  displayName: string;
  title: string | null;
  bio: string | null;
}) {
  const missing: string[] = [];
  const displayName = input.displayName.trim();
  if (
    !displayName ||
    displayName.includes("@") ||
    ["newsroom user", "unnamed account"].includes(
      displayName.toLocaleLowerCase("en-US"),
    )
  ) {
    missing.push("verified public name");
  }
  if (!input.title?.trim()) missing.push("newsroom title");
  if ((input.bio?.trim().length ?? 0) < staffBiographyMinimumLength) {
    missing.push(`biography (${staffBiographyMinimumLength}+ characters)`);
  }
  return missing;
}

export function isStaffProfileComplete(input: {
  displayName: string;
  title: string | null;
  bio: string | null;
}) {
  return getStaffProfileMissingFields(input).length === 0;
}

export function shouldPublishStaffProfile(input: {
  requested: boolean;
  isActive: boolean;
  displayName: string;
  title: string | null;
  bio: string | null;
}) {
  return input.requested && input.isActive && isStaffProfileComplete(input);
}

export function isPublicStaffProfileVisible(input: {
  isActive: boolean;
  displayName: string;
  title: string | null;
  bio: string | null;
  publicSlug: string | null;
  publicProfilePublishedAt: Date | string | null;
}) {
  return Boolean(
    input.publicSlug &&
      input.publicProfilePublishedAt &&
      shouldPublishStaffProfile({
        requested: true,
        isActive: input.isActive,
        displayName: input.displayName,
        title: input.title,
        bio: input.bio,
      }),
  );
}

export function hasVisibleStaffProfile(
  profiles: Parameters<typeof isPublicStaffProfileVisible>[0][],
) {
  return profiles.some(isPublicStaffProfileVisible);
}
