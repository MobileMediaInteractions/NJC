import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { SiteConfiguration } from "@/lib/site-settings";

export const siteDesignPreviewCookie = "njc_site_design_preview";
export type PublicSiteDesign = "legacy" | "v2";

const previewLifetimeSeconds = 60 * 60 * 4;
const productionCookieDomain = "thejerseycourier.com";

function previewSecret() {
  return (
    process.env.SITE_DESIGN_PREVIEW_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    ""
  );
}

function signature(value: string, secret = previewSecret()) {
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function productionSiteDesign(
  mode: SiteConfiguration["presentation"]["designMode"],
): PublicSiteDesign {
  return mode === "v2-production" ? "v2" : "legacy";
}

export function createSiteDesignPreviewToken(
  design: PublicSiteDesign,
  now = Date.now(),
  secret = previewSecret(),
) {
  if (!secret) return null;
  const expiresAt = Math.floor(now / 1000) + previewLifetimeSeconds;
  const payload = `${design}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySiteDesignPreviewToken(
  token: string | undefined,
  now = Date.now(),
  secret = previewSecret(),
): PublicSiteDesign | null {
  if (!token || !secret) return null;
  const [design, expiresAtValue, suppliedSignature, ...rest] = token.split(".");
  if (rest.length || (design !== "legacy" && design !== "v2")) return null;
  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return null;
  const payload = `${design}.${expiresAt}`;
  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature ?? "");
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return design;
}

export function resolveSiteDesign(input: {
  mode: SiteConfiguration["presentation"]["designMode"];
  preview?: PublicSiteDesign | null;
  environmentOverride?: PublicSiteDesign | null;
}): PublicSiteDesign {
  return input.preview ?? input.environmentOverride ?? productionSiteDesign(input.mode);
}

export function siteDesignEnvironmentOverride(
  value = process.env.SITE_DESIGN_OVERRIDE,
): PublicSiteDesign | null {
  return value === "legacy" || value === "v2" ? value : null;
}

export function siteDesignPreviewCookieDomain(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === productionCookieDomain ||
    normalized.endsWith(`.${productionCookieDomain}`)
    ? `.${productionCookieDomain}`
    : undefined;
}

/**
 * Custom Courier hosts can share the signed preview cookie with the canonical
 * publication. Vercel fallback and local hosts cannot, so their preview must
 * remain on the request origin instead of redirecting away from its cookie.
 */
export function siteDesignPreviewRedirectOrigin(
  requestUrl: URL,
  canonicalOrigin: string,
) {
  if (siteDesignPreviewCookieDomain(requestUrl.hostname)) {
    const canonical = new URL(canonicalOrigin);
    if (siteDesignPreviewCookieDomain(canonical.hostname)) {
      return canonical.origin;
    }
  }
  return requestUrl.origin;
}

/** Resolve only same-origin paths; protocol-relative and backslash URLs fail. */
export function siteDesignPreviewTarget(returnTo: string, origin: string) {
  if (
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(returnTo)
  ) {
    return null;
  }

  const base = new URL(origin);
  const target = new URL(returnTo, base);
  return target.origin === base.origin ? target : null;
}

export async function getResolvedSiteDesign(
  configuration: SiteConfiguration,
): Promise<PublicSiteDesign> {
  const token = (await cookies()).get(siteDesignPreviewCookie)?.value;
  return resolveSiteDesign({
    mode: configuration.presentation.designMode,
    preview: verifySiteDesignPreviewToken(token),
    environmentOverride: siteDesignEnvironmentOverride(),
  });
}

export function siteDesignPreviewMaxAge() {
  return previewLifetimeSeconds;
}
