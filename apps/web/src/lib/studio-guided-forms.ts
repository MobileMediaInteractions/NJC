export const accessDurationPresets = [
  { value: "permanent", label: "No expiration" },
  { value: "7_days", label: "7 days" },
  { value: "30_days", label: "30 days" },
  { value: "90_days", label: "90 days" },
  { value: "365_days", label: "1 year" },
  { value: "custom", label: "Choose a date and time" },
] as const;

export type AccessDurationPreset = typeof accessDurationPresets[number]["value"];
export type GuidedAccessScope = "product" | "tier" | "content";

const presetDays: Partial<Record<AccessDurationPreset, number>> = {
  "7_days": 7,
  "30_days": 30,
  "90_days": 90,
  "365_days": 365,
};

export function resolveAccessEnd(
  preset: AccessDurationPreset,
  customLocalValue: string,
  startsAt: Date = new Date(),
) {
  if (preset === "permanent") return null;
  if (Number.isNaN(startsAt.getTime())) return null;
  if (preset === "custom") {
    if (!customLocalValue) return null;
    const custom = new Date(customLocalValue);
    return Number.isNaN(custom.getTime()) ? null : custom.toISOString();
  }
  const days = presetDays[preset];
  if (!days) return null;
  const end = new Date(startsAt);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}

export function localDateTime(value: Date | string = new Date()) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function futureLocalDateTime(days: number, startsAt: Date | string = new Date()) {
  const date = new Date(startsAt);
  date.setDate(date.getDate() + days);
  return localDateTime(date);
}

export function generatedSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

export function initialScopeId(scope: GuidedAccessScope) {
  return scope === "product" ? "njc_plus" : "";
}
