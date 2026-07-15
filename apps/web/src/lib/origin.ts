const localOrigin = "http://localhost:3000";

function normalizeOrigin(value: string | undefined) {
  if (!value) return undefined;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the canonical origin without requiring a purchased domain.
 * Vercel supplies the production and deployment URLs automatically.
 */
export function getSiteOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(process.env.VERCEL_URL) ??
    localOrigin
  );
}

/** Use the active preview/production host for links generated during a request. */
export function getRequestOrigin(request: Request) {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(new URL(request.url).origin) ??
    getSiteOrigin()
  );
}
