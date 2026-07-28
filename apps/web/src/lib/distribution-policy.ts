export const distributionManagerRoles = ["admin", "editor", "producer"] as const;

export function canManageDistribution(role: string | null | undefined) {
  return distributionManagerRoles.includes(
    role as (typeof distributionManagerRoles)[number],
  );
}

export function isDistributionPackageAvailable(
  value: {
    status: string;
    availableAt: Date | null;
    expiresAt: Date | null;
  },
  now = new Date(),
) {
  return (
    value.status === "available" &&
    (!value.availableAt || value.availableAt <= now) &&
    (!value.expiresAt || value.expiresAt > now)
  );
}

export function isDistributionGrantActive(
  value: {
    startsAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
  },
  now = new Date(),
) {
  return (
    !value.revokedAt &&
    value.startsAt <= now &&
    (!value.expiresAt || value.expiresAt > now)
  );
}

export function isDistributionDownloadAllowed(
  policy: string,
  grantDownloadAllowed: boolean,
) {
  if (policy === "download") return true;
  if (policy === "grant_controlled") return grantDownloadAllowed;
  return false;
}
