/** JSON mutation responses contain ISO strings; RSC initial data may be Dates. */
export function formatCommunityDate(value: Date | string, timezone: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: timezone,
  }).format(date);
}
