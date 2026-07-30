import { and, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import { getOptionalAccountId } from "@/lib/auth";

export type AnalyticsRequestEnvironment =
  | "production"
  | "internal"
  | "preview"
  | "development";

export async function getAnalyticsRequestContext() {
  let userClerkId: string | null = null;
  try {
    userClerkId = await getOptionalAccountId();
  } catch {
    /* Public anonymous analytics do not require a Clerk session. */
  }

  const runtime = process.env.VERCEL_ENV;
  let environment: AnalyticsRequestEnvironment =
    runtime === "production"
      ? "production"
      : runtime
        ? "preview"
        : process.env.NODE_ENV === "production"
          ? "production"
          : "development";

  if (environment === "production" && userClerkId && hasDatabase()) {
    const [staff] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.clerkId, userClerkId), eq(users.isActive, true)))
      .limit(1);
    if (staff) environment = "internal";
  }

  return { userClerkId, environment };
}

export function getWebApplicationIdentity() {
  return {
    product: "news-web",
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.2.0",
    buildNumber:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
      process.env.NEXT_PUBLIC_BUILD_NUMBER?.trim() ||
      "local",
    releaseChannel:
      process.env.VERCEL_ENV === "production"
        ? "production"
        : process.env.VERCEL_ENV
          ? "preview"
          : "development",
  };
}
