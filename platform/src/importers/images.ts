import type { ImportResult } from "./types";

const signatures = [
  { mimeType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mimeType: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
] as const;

export function importImage(name: string, bytes: Uint8Array): ImportResult {
  if (!bytes.length || bytes.length > 32 * 1024 * 1024) return { source: null, assets: [], report: [{ source: name, disposition: "unsupported_with_error", message: "Image size is invalid" }] };
  const signature = signatures.find((item) => item.bytes.every((byte, index) => bytes[index] === byte));
  if (!signature) return { source: null, assets: [], report: [{ source: name, disposition: "unsupported_with_error", message: "PNG, JPEG, and WebP are the supported raster inputs" }] };
  return { source: null, assets: [{ name, mimeType: signature.mimeType, bytes }], report: [{ source: name, disposition: "fully_supported", message: `${signature.mimeType} asset accepted; decode remains renderer-owned` }] };
}
