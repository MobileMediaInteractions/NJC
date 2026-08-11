import { createRemoteJWKSet, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";

const productionHost = "int.thejerseycourier.com";

export type InternalPerimeterIdentity = {
  email: string;
  subject: string;
  issuer: string;
};

export function internalHost() {
  return (process.env.INTERNAL_HOST || productionHost).trim().toLowerCase();
}

export function normalizeHost(value: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function isAcceptedInternalHost(value: string | null, nodeEnv = process.env.NODE_ENV) {
  const host = normalizeHost(value);
  if (nodeEnv !== "production" && (host === "localhost" || host === "127.0.0.1")) return true;
  return host === internalHost();
}

export function internalBoundaryConfigured() {
  return Boolean(
    process.env.INTERNAL_HOST_ENABLED === "true" &&
      internalHost() &&
      process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim() &&
      process.env.CLOUDFLARE_ACCESS_AUD?.trim() &&
      (process.env.INTERNAL_ORIGIN_SECRET?.trim().length ?? 0) >= 32,
  );
}

export function hasInternalOriginProof(headers: Headers) {
  const supplied = headers.get("x-njc-internal-origin")?.trim() ?? "";
  const expected = process.env.INTERNAL_ORIGIN_SECRET?.trim() ?? "";
  if (supplied.length < 32 || expected.length < 32) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function accessIssuer() {
  const team = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!team) throw new Error("Cloudflare Access team domain is not configured");
  return `https://${team}`;
}

export async function verifyInternalPerimeter(headers: Headers): Promise<InternalPerimeterIdentity | null> {
  if (!internalBoundaryConfigured() || !isAcceptedInternalHost(headers.get("host")) || !hasInternalOriginProof(headers)) return null;
  const token = headers.get("cf-access-jwt-assertion")?.trim();
  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim();
  if (!token || !audience) return null;
  const issuer = accessIssuer();
  try {
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email || typeof payload.sub !== "string") return null;
    return { email, subject: payload.sub, issuer };
  } catch {
    return null;
  }
}
