export type CompatibilityDisposition = "fully_supported" | "approximated" | "converted" | "rasterized" | "ignored_with_warning" | "unsupported_with_error";
export type CompatibilityItem = { source: string; disposition: CompatibilityDisposition; message: string };
export type ImportResult = { source: string | null; report: CompatibilityItem[]; assets: Array<{ name: string; mimeType: string; bytes: Uint8Array }> };
