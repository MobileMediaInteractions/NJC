const defaultStudioHost = "studio.thejerseycourier.com";

export function resolveStudioAuthRouting(
  requestHost: string | null,
  studioHost = process.env.NEXT_PUBLIC_STUDIO_HOST ?? defaultStudioHost,
) {
  const host = normalizeHost(requestHost);
  const cleanStudioHost = normalizeHost(studioHost);
  const usesCleanStudioPaths = Boolean(host && host === cleanStudioHost);

  return usesCleanStudioPaths
    ? {
        signInPath: "/sign-in",
        signInUrl: "/sign-in",
        afterSignInUrl: "/",
        usesCleanStudioPaths,
      }
    : {
        signInPath: "/studio/sign-in",
        signInUrl: "/studio/sign-in",
        afterSignInUrl: "/studio",
        usesCleanStudioPaths,
      };
}

function normalizeHost(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";
}
