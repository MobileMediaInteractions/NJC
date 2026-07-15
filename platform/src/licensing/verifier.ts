import { fromBase64Url } from "./canonical";
import { verifyReceiptSignature } from "./crypto-node";
import type { ApplicationIdentity, ReceiptClaims, ReceiptValidation, SignedReceipt, SigningKeyRecord } from "./types";

export type ReceiptExpectations = { issuer: string; audience: string; productId: string; application: ApplicationIdentity; now?: Date; knownRevokedLicenseIds?: ReadonlySet<string>; allowGrace?: boolean };
function sameIdentity(actual: ApplicationIdentity, expected: ApplicationIdentity) { return actual.applicationId === expected.applicationId && actual.platform === expected.platform && actual.environment === expected.environment && actual.buildId === expected.buildId && actual.bundleOrPackageId === expected.bundleOrPackageId && actual.signingIdentity === expected.signingIdentity && actual.host === expected.host; }
const invalid = (code: Exclude<ReceiptValidation, { ok: true }>["code"], message: string): ReceiptValidation => ({ ok: false, code, message });
export function verifySignedReceipt(receipt: SignedReceipt, keys: readonly SigningKeyRecord[], expected: ReceiptExpectations): ReceiptValidation {
  if (!receipt || typeof receipt.payload !== "string" || typeof receipt.signature !== "string" || receipt.algorithm !== "Ed25519") return invalid("malformed", "The receipt envelope is malformed.");
  const key = keys.find((item) => item.id === receipt.keyId); if (!key) return invalid("unknown_key", "The receipt signing key is unknown.");
  if (!verifyReceiptSignature(receipt, key.publicKeyPem)) return invalid("signature_invalid", "The receipt signature is invalid.");
  let claims: ReceiptClaims; try { claims = JSON.parse(Buffer.from(fromBase64Url(receipt.payload)).toString("utf8")) as ReceiptClaims; } catch { return invalid("malformed", "The receipt payload is malformed."); }
  if (claims.receiptVersion !== 1) return invalid("unsupported_version", "The receipt version is unsupported.");
  if (claims.issuer !== expected.issuer) return invalid("wrong_issuer", "The receipt issuer does not match.");
  if (claims.audience !== expected.audience) return invalid("wrong_audience", "The receipt audience does not match.");
  if (claims.productId !== expected.productId) return invalid("wrong_product", "The receipt product does not match.");
  if (!sameIdentity(claims.application, expected.application)) return invalid(claims.application.environment !== expected.application.environment ? "wrong_environment" : "wrong_application", "The receipt application identity does not match.");
  if (expected.knownRevokedLicenseIds?.has(claims.licenseId)) return invalid("revoked", "The license has been revoked.");
  const now = (expected.now ?? new Date()).getTime(); if (Date.parse(claims.notBefore) > now) return invalid("not_yet_valid", "The receipt is not valid yet.");
  const leaseEnd = Date.parse(claims.leaseExpiresAt); const graceEnd = Date.parse(claims.graceEndsAt); if (now > leaseEnd && (!expected.allowGrace || now > graceEnd)) return invalid("expired", "The license lease has expired.");
  return { ok: true, claims, inGrace: now > leaseEnd };
}

export class MonotonicLeaseClock {
  #serverEpochMs = 0; #monotonicAtSync = 0; #latestWallMs = 0;
  sync(serverTime: Date, monotonicMs: number) { this.#serverEpochMs = serverTime.getTime(); this.#monotonicAtSync = monotonicMs; this.#latestWallMs = Math.max(this.#latestWallMs, serverTime.getTime()); }
  now(wall: Date, monotonicMs: number) { const elapsedEstimate = this.#serverEpochMs ? this.#serverEpochMs + Math.max(0, monotonicMs - this.#monotonicAtSync) : wall.getTime(); this.#latestWallMs = Math.max(this.#latestWallMs, wall.getTime(), elapsedEstimate); return new Date(this.#latestWallMs); }
}
