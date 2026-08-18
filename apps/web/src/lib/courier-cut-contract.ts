export const courierCutDistributionModes = [
  "njc_plus_only",
  "njc_plus_and_subdomain",
] as const;

export type CourierCutDistributionMode =
  (typeof courierCutDistributionModes)[number];

export const defaultCourierCutDistributionMode: CourierCutDistributionMode =
  "njc_plus_only";

export function resolveCourierCutDistributionMode(
  configuration: Record<string, unknown> | null | undefined,
): CourierCutDistributionMode {
  return configuration?.distributionMode === "njc_plus_and_subdomain"
    ? "njc_plus_and_subdomain"
    : defaultCourierCutDistributionMode;
}

/**
 * There is deliberately no Courier-Cut-only state. When the dedicated host is
 * allowed to serve a cut, the same invitation must continue to work in NJC+.
 */
export function withCourierCutDistributionMode(
  configuration: Record<string, unknown> | null | undefined,
  distributionMode: CourierCutDistributionMode,
) {
  return {
    ...(configuration ?? {}),
    distributionMode: resolveCourierCutDistributionMode({ distributionMode }),
  };
}

