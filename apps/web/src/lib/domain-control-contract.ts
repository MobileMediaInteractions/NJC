import { createHmac, timingSafeEqual } from "node:crypto";

export const domainChallengeLifetimeSeconds = 300;

type ChallengePayload = {
  actor: string;
  hostname: string;
  expiresAt: number;
  operation: "provision";
};

function challengeSecret() {
  const secret = process.env.DOMAIN_CONTROL_CHALLENGE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Domain-control challenge signing is not configured");
  }
  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", challengeSecret()).update(value).digest("base64url");
}

export function createDomainProvisioningChallenge(actor: string, hostname: string, now = Date.now()) {
  const payload: ChallengePayload = {
    actor,
    hostname,
    expiresAt: now + domainChallengeLifetimeSeconds * 1_000,
    operation: "provision",
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyDomainProvisioningChallenge(
  challenge: string,
  expected: { actor: string; hostname: string },
  now = Date.now(),
) {
  const [encoded, providedSignature, extra] = challenge.split(".");
  if (!encoded || !providedSignature || extra) return false;
  const expectedSignature = sign(encoded);
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const payload = JSON.parse(decode(encoded)) as ChallengePayload;
    return payload.operation === "provision" &&
      payload.actor === expected.actor &&
      payload.hostname === expected.hostname &&
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt >= now;
  } catch {
    return false;
  }
}

export function confirmationForHostname(hostname: string) {
  return `CREATE ${hostname}`;
}

export function isTrustedDomainControlHost(host: string | null, production = process.env.NODE_ENV === "production") {
  const normalized = host?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";
  if (normalized === "studio.thejerseycourier.com") return true;
  return !production && ["localhost", "127.0.0.1", "[::1]"].includes(normalized);
}
