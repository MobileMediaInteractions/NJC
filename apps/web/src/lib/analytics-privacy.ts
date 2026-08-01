import { createHmac } from "node:crypto";

export function pseudonymizeAnalyticsIdentifier(value: string | null) {
  if (!value) return "";
  const secret =
    process.env.ANALYTICS_PSEUDONYM_SECRET ??
    process.env.CRON_SECRET ??
    "njc-analytics-local-development-only";
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 16);
}
