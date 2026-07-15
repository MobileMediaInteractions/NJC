function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalValue(item)]));
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Canonical payload cannot contain a non-finite number");
  return value;
}
export function canonicalJson(value: unknown) { return JSON.stringify(canonicalValue(value)); }
export function toBase64Url(value: Uint8Array | string) { return Buffer.from(value).toString("base64url"); }
export function fromBase64Url(value: string) { return new Uint8Array(Buffer.from(value, "base64url")); }
