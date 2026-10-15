import { hasStudioAccessRole, normalizeStudioHref } from "@/lib/site-account";

export const ACCOUNT_CONTINUE_PATH = "/auth/continue";
/** Navigation only. Every destination still performs its own authorization. */
export function accountLandingPath(role: unknown, studioUrl?: string) {
  return hasStudioAccessRole(role) ? normalizeStudioHref(studioUrl) : "/profile";
}

/** Reject external, protocol-relative and recursive sign-in destinations. */
export function safeAccountReturnTo(value: unknown, origin: string, allowedOrigins: string[] = []) {
  if (typeof value !== "string" || value.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(value) || value.startsWith("//")) return null;
  try {
    if (!value.startsWith("/") && !value.startsWith("https://")) return null;
    const url = new URL(value, origin);
    if (![new URL(origin).origin, ...allowedOrigins].includes(url.origin) || url.username || url.password) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (/[\\\u0000-\u0020\u007f]/.test(pathname) || pathname.startsWith("//")) return null;
    if (/^\/(?:sign-in|sign-up|auth\/continue|studio\/sign-in)(?:\/|$)/.test(pathname)) return null;
    return url.origin === new URL(origin).origin ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch { return null; }
}

export function accountContinueUrl(returnTo: unknown, origin: string, allowedOrigins: string[] = []) {
  const destination = safeAccountReturnTo(returnTo, origin, allowedOrigins);
  return destination ? `${ACCOUNT_CONTINUE_PATH}?returnTo=${encodeURIComponent(destination)}` : ACCOUNT_CONTINUE_PATH;
}

export function accountReturnOrigins() {
  return [
    process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://studio.thejerseycourier.com",
    `https://${process.env.NEXT_PUBLIC_PLUS_HOST ?? "plus.thejerseycourier.com"}`,
    `https://${process.env.NEXT_PUBLIC_COURIER_CUT_HOST ?? "cut.thejerseycourier.com"}`,
    process.env.NEXT_PUBLIC_DISTRIBUTION_URL ?? "https://distribution.thejerseycourier.com",
  ].flatMap((value) => { try { const url = new URL(value); return url.protocol === "https:" ? [url.origin] : []; } catch { return []; } });
}
