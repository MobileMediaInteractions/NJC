import { clerkClient } from "@clerk/nextjs/server";

export type ReleaseChannel = "production" | "beta" | "alpha";

export function resolveReleaseChannel(metadata: unknown): ReleaseChannel {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "production";
  const values = metadata as Record<string, unknown>;
  const candidate = values.releaseChannel ?? values.release_channel;
  if (candidate === "alpha" || candidate === "beta") return candidate;
  if (values.betaAccess === true || values.beta_access === true) return "beta";
  return "production";
}

export async function getAccountReleaseChannel(clerkId: string): Promise<ReleaseChannel> {
  try {
    const account = await (await clerkClient()).users.getUser(clerkId);
    return resolveReleaseChannel(account.publicMetadata);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "Account release channel lookup failed",
      clerkId,
      error: error instanceof Error ? error.message : String(error),
    }));
    return "production";
  }
}
