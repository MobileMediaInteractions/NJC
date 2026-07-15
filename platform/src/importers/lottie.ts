import type { CompatibilityDisposition, CompatibilityItem, ImportResult } from "./types";

type LottieDocument = { v?: string; fr?: number; ip?: number; op?: number; layers?: Array<Record<string, unknown>>; assets?: Array<Record<string, unknown>> };
const layerKinds: Record<number, { name: string; disposition: CompatibilityDisposition }> = {
  0: { name: "precomposition", disposition: "approximated" },
  1: { name: "solid", disposition: "converted" },
  2: { name: "image", disposition: "converted" },
  3: { name: "null", disposition: "converted" },
  4: { name: "shape", disposition: "approximated" },
  5: { name: "text", disposition: "approximated" },
  13: { name: "camera", disposition: "unsupported_with_error" },
};

export function inspectLottie(input: string | object): ImportResult {
  let document: LottieDocument;
  try { document = typeof input === "string" ? JSON.parse(input) as LottieDocument : input as LottieDocument; }
  catch { return { source: null, assets: [], report: [{ source: "document", disposition: "unsupported_with_error", message: "Lottie JSON is invalid" }] }; }
  const report: CompatibilityItem[] = [];
  if (!Array.isArray(document.layers)) return { source: null, assets: [], report: [{ source: "document", disposition: "unsupported_with_error", message: "Lottie layers are missing" }] };
  report.push({ source: "timing", disposition: "converted", message: `Frame timing ${document.fr ?? "unknown"} fps is converted to deterministic milliseconds` });
  document.layers.forEach((layer, index) => {
    const type = typeof layer.ty === "number" ? layerKinds[layer.ty] : undefined;
    const name = typeof layer.nm === "string" ? layer.nm : `layer ${index}`;
    if (!type) report.push({ source: name, disposition: "unsupported_with_error", message: `Unknown layer type ${String(layer.ty)}` });
    else report.push({ source: name, disposition: type.disposition, message: `${type.name} layer requires conversion by the full importer` });
    if (layer.ef) report.push({ source: `${name}.effects`, disposition: "unsupported_with_error", message: "Effects are reported and never silently discarded" });
    if (layer.tt) report.push({ source: `${name}.matte`, disposition: "approximated", message: "Track mattes require renderer capability checks" });
    if (layer.x) report.push({ source: `${name}.expressions`, disposition: "unsupported_with_error", message: "Expressions are executable behavior and are not imported" });
  });
  return { source: null, assets: [], report };
}
export function inspectDotLottie(bytes: Uint8Array): ImportResult {
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  return { source: null, assets: [], report: [{ source: "container", disposition: zip ? "ignored_with_warning" : "unsupported_with_error", message: zip ? "dotLottie ZIP recognized; archive extraction and manifest selection require the optional importer package" : "Input is not a ZIP-based dotLottie package" }] };
}
