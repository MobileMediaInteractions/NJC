import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { canonicalJson, fromBase64Url, toBase64Url } from "./canonical";
import type { ReceiptClaims, SignedReceipt, SigningKeyRecord } from "./types";

export interface SigningKeyProvider {
  activeKey(): Promise<{ keyId: string; privateKey: KeyObject }>;
  publicKeys(): Promise<SigningKeyRecord[]>;
  rotate(): Promise<SigningKeyRecord>;
}
export class InMemoryEd25519KeyProvider implements SigningKeyProvider {
  readonly #keys = new Map<string, { privateKey: KeyObject; record: SigningKeyRecord }>(); #active: string;
  constructor(seed?: { keyId: string; privateKeyPem: string; publicKeyPem?: string }) {
    const pair = seed ? { privateKey: createPrivateKey(seed.privateKeyPem), publicKey: seed.publicKeyPem ? createPublicKey(seed.publicKeyPem) : createPublicKey(seed.privateKeyPem) } : generateKeyPairSync("ed25519");
    const keyId = seed?.keyId ?? `key-${crypto.randomUUID()}`; const now = new Date().toISOString();
    this.#keys.set(keyId, { privateKey: pair.privateKey, record: { id: keyId, algorithm: "Ed25519", publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(), status: "active", createdAt: now } }); this.#active = keyId;
  }
  async activeKey() { const key = this.#keys.get(this.#active); if (!key) throw new Error("No active signing key"); return { keyId: this.#active, privateKey: key.privateKey }; }
  async publicKeys() { return [...this.#keys.values()].map(({ record }) => ({ ...record })); }
  async rotate() { const old = this.#keys.get(this.#active); if (old) old.record = { ...old.record, status: "retired", retiredAt: new Date().toISOString() }; const pair = generateKeyPairSync("ed25519"); const id = `key-${crypto.randomUUID()}`; const record: SigningKeyRecord = { id, algorithm: "Ed25519", publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(), status: "active", createdAt: new Date().toISOString() }; this.#keys.set(id, { privateKey: pair.privateKey, record }); this.#active = id; return { ...record }; }
}
export async function signReceipt(claims: ReceiptClaims, keys: SigningKeyProvider): Promise<SignedReceipt> { const active = await keys.activeKey(); const payload = toBase64Url(canonicalJson(claims)); const signature = sign(null, fromBase64Url(payload), active.privateKey); return { keyId: active.keyId, algorithm: "Ed25519", payload, signature: toBase64Url(signature) }; }
export function verifyReceiptSignature(receipt: SignedReceipt, publicKeyPem: string) { if (receipt.algorithm !== "Ed25519") return false; return verify(null, fromBase64Url(receipt.payload), createPublicKey(publicKeyPem), fromBase64Url(receipt.signature)); }
