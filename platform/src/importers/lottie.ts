import type { CompatibilityItem, ImportResult } from "./types";

type JsonRecord = Record<string, unknown>;
type LottieDocument = JsonRecord & {
  v?: string;
  ver?: number;
  nm?: string;
  fr?: number;
  ip?: number;
  op?: number;
  w?: number;
  h?: number;
  layers?: unknown[];
  assets?: unknown[];
};
type Animatable<T> = { initial: T; keyframes: Array<{ frame: number; value: T; easing: string }>; animated: boolean };
type NumericFrame = { timeMs: number; value: number; easing: string };
type PaniComponent = { id: string; kind: "rect" | "text" | "path" | "image" | "lottie"; properties: Array<[string, string]>; layerName: string };
type PaniTrack = { target: string; keyframes: NumericFrame[] };

export type LottieImportSummary = {
  valid: boolean;
  sourceVersion?: string;
  width: number;
  height: number;
  frameRate: number;
  durationMs: number;
  layers: number;
  components: number;
  errors: number;
  warnings: number;
};

export type LottieImportResult = ImportResult & { summary: LottieImportSummary };
export type LottieImportOptions = { packageName?: string; sceneName?: string; sourceName?: string; losslessFallback?: boolean };

const maximumJsonBytes = 10 * 1024 * 1024;
const maximumLayers = 2_000;
const maximumDocumentNodes = 250_000;
const maximumDepth = 64;

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const rounded = (value: number) => Number(value.toFixed(4));
const safeIdentifier = (value: string, fallback: string) => value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^\d+/, "") || fallback;
const sceneIdentifier = (value: string) => { const result = safeIdentifier(value, "ImportedLottie"); return result.charAt(0).toUpperCase() + result.slice(1); };
const stringLiteral = (value: string) => JSON.stringify(value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""));
const scalar = (value: number, unit = "") => `${rounded(value)}${unit}`;
const vector = (value: unknown, length: number): number[] | null => {
  const candidate = Array.isArray(value) && Array.isArray(value[0]) ? value[0] : value;
  if (!Array.isArray(candidate) || candidate.length < length) return null;
  const result = candidate.slice(0, length);
  return result.every(finite) ? result as number[] : null;
};
const numberValue = (value: unknown): number | null => {
  if (finite(value)) return value;
  const candidate = vector(value, 1);
  return candidate?.[0] ?? null;
};

function base64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!; const second = bytes[index + 1]; const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    encoded += second === undefined ? "=" : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    encoded += third === undefined ? "=" : alphabet[third & 63];
  }
  return encoded;
}

function baseSummary(): LottieImportSummary {
  return { valid: false, width: 0, height: 0, frameRate: 0, durationMs: 0, layers: 0, components: 0, errors: 0, warnings: 0 };
}

function result(source: string | null, report: CompatibilityItem[], summary: LottieImportSummary): LottieImportResult {
  const uniqueReport = [...new Map(report.map((item) => [`${item.source}\u0000${item.disposition}\u0000${item.message}`, item])).values()];
  const errors = uniqueReport.filter((item) => item.disposition === "unsupported_with_error").length;
  const warnings = uniqueReport.filter((item) => item.disposition === "approximated" || item.disposition === "ignored_with_warning").length;
  return { source: errors ? null : source, assets: [], report: uniqueReport, summary: { ...summary, valid: errors === 0 && source !== null, errors, warnings } };
}

function parseDocument(input: string | object, report: CompatibilityItem[]): LottieDocument | null {
  if (typeof input === "string" && new TextEncoder().encode(input).length > maximumJsonBytes) {
    report.push({ source: "document", disposition: "unsupported_with_error", message: "Lottie JSON exceeds the 10 MiB translation limit" });
    return null;
  }
  let parsed: unknown;
  try { parsed = typeof input === "string" ? JSON.parse(input) : input; }
  catch { report.push({ source: "document", disposition: "unsupported_with_error", message: "Lottie JSON is not valid JSON" }); return null; }
  if (!isRecord(parsed)) {
    report.push({ source: "document", disposition: "unsupported_with_error", message: "A Lottie document must be a JSON object" });
    return null;
  }
  let nodes = 0;
  const pending: Array<{ value: unknown; depth: number }> = [{ value: parsed, depth: 0 }];
  while (pending.length) {
    const current = pending.pop()!;
    nodes += 1;
    if (nodes > maximumDocumentNodes || current.depth > maximumDepth) {
      report.push({ source: "document", disposition: "unsupported_with_error", message: "Lottie JSON exceeds the translation complexity limit" });
      return null;
    }
    if (Array.isArray(current.value)) for (const value of current.value) pending.push({ value, depth: current.depth + 1 });
    else if (isRecord(current.value)) for (const [key, value] of Object.entries(current.value)) {
      if (key === "x" && typeof value === "string" && value.trim()) report.push({ source: "expressions", disposition: "unsupported_with_error", message: "Lottie expressions are executable behavior and cannot be translated safely" });
      pending.push({ value, depth: current.depth + 1 });
    }
  }
  return parsed;
}

function validateDocument(document: LottieDocument, report: CompatibilityItem[]) {
  const fields: Array<[keyof LottieDocument, string, (value: number) => boolean]> = [
    ["fr", "frame rate", (value) => value > 0 && value <= 240],
    ["ip", "in point", () => true],
    ["op", "out point", () => true],
    ["w", "width", (value) => value > 0 && value <= 8_192],
    ["h", "height", (value) => value > 0 && value <= 8_192],
  ];
  for (const [field, label, predicate] of fields) if (!finite(document[field]) || !predicate(document[field] as number)) report.push({ source: `document.${field}`, disposition: "unsupported_with_error", message: `Lottie ${label} is missing or outside the supported range` });
  if (finite(document.ip) && finite(document.op) && document.op <= document.ip) report.push({ source: "document.op", disposition: "unsupported_with_error", message: "Lottie out point must be after its in point" });
  if (!Array.isArray(document.layers) || !document.layers.length || document.layers.length > maximumLayers) report.push({ source: "document.layers", disposition: "unsupported_with_error", message: `Lottie must contain 1 to ${maximumLayers.toLocaleString()} layers` });
  else document.layers.forEach((layer, index) => {
    if (!isRecord(layer)) report.push({ source: `layer ${index}`, disposition: "unsupported_with_error", message: "Lottie layer must be a JSON object" });
    else if (!finite(layer.ty)) report.push({ source: typeof layer.nm === "string" ? layer.nm : `layer ${index}`, disposition: "unsupported_with_error", message: "Lottie layer type is missing" });
  });
  if (document.assets !== undefined && !Array.isArray(document.assets)) report.push({ source: "document.assets", disposition: "unsupported_with_error", message: "Lottie assets must be an array" });
}

function readAnimatable<T>(input: unknown, normalize: (value: unknown) => T | null, fallback: T, source: string, report: CompatibilityItem[]): Animatable<T> {
  if (!isRecord(input)) return { initial: fallback, keyframes: [], animated: false };
  const raw = input.k;
  const keyframeRecords = Array.isArray(raw) && raw.some((item) => isRecord(item) && finite(item.t));
  if (input.a === 1 || keyframeRecords) {
    if (!Array.isArray(raw)) {
      report.push({ source, disposition: "unsupported_with_error", message: "Animated Lottie property has no keyframe array" });
      return { initial: fallback, keyframes: [], animated: true };
    }
    const keyframes: Animatable<T>["keyframes"] = [];
    let previousEnd: unknown;
    let previousValue = fallback;
    for (const entry of raw) {
      if (!isRecord(entry) || !finite(entry.t)) continue;
      const value = normalize(entry.s) ?? normalize(previousEnd) ?? previousValue;
      previousValue = value;
      previousEnd = entry.e;
      keyframes.push({ frame: entry.t, value, easing: entry.h === 1 ? "steps1" : "linear" });
      if ((entry.i !== undefined || entry.o !== undefined) && entry.h !== 1) report.push({ source, disposition: "approximated", message: "Cubic Lottie easing is translated to linear easing in PANI language 1" });
      if (entry.to !== undefined || entry.ti !== undefined) report.push({ source, disposition: "approximated", message: "Spatial motion tangents are translated as straight-line position keyframes" });
    }
    if (!keyframes.length) report.push({ source, disposition: "unsupported_with_error", message: "Animated Lottie property has no usable numeric keyframes" });
    return { initial: keyframes[0]?.value ?? fallback, keyframes, animated: true };
  }
  const value = normalize(raw);
  if (value === null && raw !== undefined) report.push({ source, disposition: "unsupported_with_error", message: "Lottie property contains an invalid static value" });
  return { initial: value ?? fallback, keyframes: [], animated: false };
}

function transformFor(layer: JsonRecord, source: string, report: CompatibilityItem[]) {
  const transform = isRecord(layer.ks) ? layer.ks : {};
  const anchor = readAnimatable(transform.a, (value) => vector(value, 2), [0, 0], `${source}.anchor`, report);
  if (anchor.animated) report.push({ source: `${source}.anchor`, disposition: "unsupported_with_error", message: "Animated anchor points require a matrix transform not available in PANI language 1" });
  let positionX: Animatable<number>; let positionY: Animatable<number>;
  if (isRecord(transform.p) && transform.p.s === true) {
    positionX = readAnimatable(transform.p.x, numberValue, 0, `${source}.position.x`, report);
    positionY = readAnimatable(transform.p.y, numberValue, 0, `${source}.position.y`, report);
  } else {
    const position = readAnimatable(transform.p, (value) => vector(value, 2), [0, 0], `${source}.position`, report);
    positionX = { initial: position.initial[0]!, keyframes: position.keyframes.map((item) => ({ ...item, value: item.value[0]! })), animated: position.animated };
    positionY = { initial: position.initial[1]!, keyframes: position.keyframes.map((item) => ({ ...item, value: item.value[1]! })), animated: position.animated };
  }
  const scaleVector = readAnimatable(transform.s, (value) => vector(value, 2), [100, 100], `${source}.scale`, report);
  for (const value of [scaleVector.initial, ...scaleVector.keyframes.map((item) => item.value)]) if (Math.abs(value[0]! - value[1]!) > 0.01) {
    report.push({ source: `${source}.scale`, disposition: "approximated", message: "Non-uniform Lottie scale is averaged because PANI language 1 uses uniform scale" });
    break;
  }
  const scale: Animatable<number> = { initial: (scaleVector.initial[0]! + scaleVector.initial[1]!) / 200, keyframes: scaleVector.keyframes.map((item) => ({ ...item, value: (item.value[0]! + item.value[1]!) / 200 })), animated: scaleVector.animated };
  const rotation = readAnimatable(transform.r ?? transform.rz, numberValue, 0, `${source}.rotation`, report);
  const opacityRaw = readAnimatable(transform.o, numberValue, 100, `${source}.opacity`, report);
  const opacity: Animatable<number> = { initial: opacityRaw.initial / 100, keyframes: opacityRaw.keyframes.map((item) => ({ ...item, value: item.value / 100 })), animated: opacityRaw.animated };
  return { anchor: anchor.initial, x: positionX, y: positionY, scale, rotation, opacity };
}

function colorHex(value: unknown, fallback = "#000000") {
  if (typeof value === "string" && /^#[0-9a-f]{6,8}$/i.test(value)) return value.toUpperCase();
  const color = vector(value, 3);
  if (!color) return fallback;
  const part = (channel: number) => Math.max(0, Math.min(255, Math.round(channel <= 1 ? channel * 255 : channel))).toString(16).padStart(2, "0");
  return `#${part(color[0]!)}${part(color[1]!)}${part(color[2]!)}`.toUpperCase();
}

function staticProperty<T>(input: unknown, normalize: (value: unknown) => T | null, fallback: T, source: string, report: CompatibilityItem[]) {
  const value = readAnimatable(input, normalize, fallback, source, report);
  if (value.animated) report.push({ source, disposition: "unsupported_with_error", message: "This animated shape property cannot be represented by the current translator" });
  return value.initial;
}

function bezierPath(shape: unknown): string | null {
  if (!isRecord(shape) || !Array.isArray(shape.v) || !Array.isArray(shape.i) || !Array.isArray(shape.o) || !shape.v.length) return null;
  const vertices = shape.v.map((item) => vector(item, 2));
  const incoming = shape.i.map((item) => vector(item, 2));
  const outgoing = shape.o.map((item) => vector(item, 2));
  if (vertices.some((item) => !item) || incoming.some((item) => !item) || outgoing.some((item) => !item) || vertices.length !== incoming.length || vertices.length !== outgoing.length) return null;
  const point = (value: number[]) => `${rounded(value[0]!)},${rounded(value[1]!)}`;
  const commands = [`M ${point(vertices[0]!)}`];
  for (let index = 1; index < vertices.length; index += 1) {
    const from = vertices[index - 1]!; const to = vertices[index]!; const out = outgoing[index - 1]!; const into = incoming[index]!;
    commands.push(`C ${point([from[0]! + out[0]!, from[1]! + out[1]!])} ${point([to[0]! + into[0]!, to[1]! + into[1]!])} ${point(to)}`);
  }
  if (shape.c === true && vertices.length > 1) {
    const from = vertices.at(-1)!; const to = vertices[0]!; const out = outgoing.at(-1)!; const into = incoming[0]!;
    commands.push(`C ${point([from[0]! + out[0]!, from[1]! + out[1]!])} ${point([to[0]! + into[0]!, to[1]! + into[1]!])} ${point(to)} Z`);
  }
  return commands.join(" ");
}

function styleFor(items: unknown[], source: string, report: CompatibilityItem[]) {
  const fill = items.find((item) => isRecord(item) && item.ty === "fl") as JsonRecord | undefined;
  const stroke = items.find((item) => isRecord(item) && item.ty === "st") as JsonRecord | undefined;
  if (fill && stroke) report.push({ source, disposition: "approximated", message: "Combined fill and stroke are represented by the fill; duplicate the translated path to restore a separate outline" });
  if (fill) {
    const opacity = staticProperty(fill.o, numberValue, 100, `${source}.fill.opacity`, report);
    if (opacity !== 100) report.push({ source: `${source}.fill.opacity`, disposition: "unsupported_with_error", message: "Shape fill opacity must be baked into the layer before import" });
    if (fill.r === 2) report.push({ source: `${source}.fillRule`, disposition: "approximated", message: "Even-odd fill rule is translated using the runtime's default nonzero rule" });
    return { color: colorHex(staticProperty(fill.c, (value) => vector(value, 3), [0, 0, 0], `${source}.fill.color`, report)), mode: "fill" as const, strokeWidth: 0 };
  }
  if (stroke) {
    const opacity = staticProperty(stroke.o, numberValue, 100, `${source}.stroke.opacity`, report);
    if (opacity !== 100) report.push({ source: `${source}.stroke.opacity`, disposition: "unsupported_with_error", message: "Shape stroke opacity must be baked into the layer before import" });
    if (stroke.d !== undefined) report.push({ source: `${source}.stroke.dash`, disposition: "unsupported_with_error", message: "Dashed strokes must be expanded to paths before import" });
    if (stroke.lc !== undefined || stroke.lj !== undefined) report.push({ source: `${source}.strokeStyle`, disposition: "approximated", message: "Stroke cap and join use the PANI renderer defaults" });
    return { color: colorHex(staticProperty(stroke.c, (value) => vector(value, 3), [0, 0, 0], `${source}.stroke.color`, report)), mode: "stroke" as const, strokeWidth: staticProperty(stroke.w, numberValue, 1, `${source}.stroke.width`, report) };
  }
  return { color: "#000000", mode: "fill" as const, strokeWidth: 0 };
}

function groupTransformIsDefault(items: unknown[]) {
  const transform = items.find((item) => isRecord(item) && item.ty === "tr") as JsonRecord | undefined;
  if (!transform) return true;
  if ([transform.p, transform.a, transform.s, transform.r, transform.o].some((property) => isRecord(property) && property.a === 1)) return false;
  const raw = (property: unknown) => isRecord(property) ? property.k : undefined;
  const position = vector(raw(transform.p), 2) ?? [0, 0];
  const anchor = vector(raw(transform.a), 2) ?? [0, 0];
  const scaleValue = vector(raw(transform.s), 2) ?? [100, 100];
  const rotation = numberValue(raw(transform.r)) ?? 0;
  const opacity = numberValue(raw(transform.o)) ?? 100;
  return position[0] === 0 && position[1] === 0 && anchor[0] === 0 && anchor[1] === 0 && scaleValue[0] === 100 && scaleValue[1] === 100 && rotation === 0 && opacity === 100;
}

function translateShapeItems(items: unknown[], layerId: string, layerName: string, baseX: number, baseY: number, report: CompatibilityItem[], components: PaniComponent[], usedIds: Set<string>) {
  const style = styleFor(items, layerName, report);
  let converted = 0;
  items.forEach((item, index) => {
    if (!isRecord(item) || typeof item.ty !== "string") return;
    if (["fl", "st", "tr"].includes(item.ty)) return;
    if (item.ty === "gr") {
      if (!Array.isArray(item.it)) { report.push({ source: `${layerName}.group`, disposition: "unsupported_with_error", message: "Shape group has no item list" }); return; }
      if (!groupTransformIsDefault(item.it)) { report.push({ source: `${layerName}.group`, disposition: "unsupported_with_error", message: "Transformed shape groups must be flattened before import" }); return; }
      report.push({ source: `${layerName}.group`, disposition: "approximated", message: "Nested shape group is flattened into editable PANI components" });
      converted += translateShapeItems(item.it, `${layerId}_group_${index}`, layerName, baseX, baseY, report, components, usedIds);
      return;
    }
    const idBase = safeIdentifier(`${layerId}_${typeof item.nm === "string" ? item.nm : `shape_${index}`}`, `${layerId}_shape_${index}`);
    let id = idBase; let suffix = 2; while (usedIds.has(id)) id = `${idBase}_${suffix++}`; usedIds.add(id);
    if (item.ty === "rc" || item.ty === "el") {
      const size = staticProperty(item.s, (value) => vector(value, 2), [100, 100], `${layerName}.${id}.size`, report);
      const position = staticProperty(item.p, (value) => vector(value, 2), [0, 0], `${layerName}.${id}.position`, report);
      const radius = item.ty === "el" ? Math.min(size[0]!, size[1]!) / 2 : staticProperty(item.r, numberValue, 0, `${layerName}.${id}.radius`, report);
      components.push({ id, kind: "rect", layerName, properties: [["x", scalar(baseX + position[0]! - size[0]! / 2, "dp")], ["y", scalar(baseY + position[1]! - size[1]! / 2, "dp")], ["width", scalar(size[0]!, "dp")], ["height", scalar(size[1]!, "dp")], ["fill", style.color], ["cornerRadius", scalar(radius, "dp")]] });
      report.push({ source: `${layerName}.${id}`, disposition: item.ty === "el" ? "approximated" : "converted", message: item.ty === "el" ? "Ellipse converted to an editable rounded rectangle" : "Rectangle converted to an editable PANI rectangle" });
      converted += 1;
      return;
    }
    if (item.ty === "sh") {
      const shape = staticProperty(item.ks, (value) => isRecord(value) ? value : null, null, `${layerName}.${id}.path`, report);
      const path = bezierPath(shape);
      if (!path) { report.push({ source: `${layerName}.${id}`, disposition: "unsupported_with_error", message: "Bezier path data is incomplete" }); return; }
      const properties: Array<[string, string]> = [["x", scalar(baseX, "dp")], ["y", scalar(baseY, "dp")], ["path", stringLiteral(path)], ["fill", style.color], ["pathMode", stringLiteral(style.mode)]];
      if (style.mode === "stroke") properties.push(["strokeWidth", scalar(style.strokeWidth)]);
      components.push({ id, kind: "path", layerName, properties });
      report.push({ source: `${layerName}.${id}`, disposition: "converted", message: "Static Lottie Bezier path converted to editable SVG-compatible path data" });
      converted += 1;
      return;
    }
    if (["mm", "rp", "tm", "gf", "gs", "pb", "zz", "op"].includes(item.ty)) report.push({ source: `${layerName}.${id}`, disposition: "unsupported_with_error", message: `Lottie shape operator '${item.ty}' requires a renderer feature not available in PANI language 1` });
  });
  return converted;
}

function frameTime(frame: number, document: LottieDocument) {
  return Math.max(0, Math.min(Math.round(((document.op! - document.ip!) / document.fr!) * 1_000), Math.round(((frame - document.ip!) / document.fr!) * 1_000)));
}

function trackFrames<T>(animation: Animatable<T>, document: LottieDocument, map: (value: T) => number) {
  const frames: NumericFrame[] = animation.keyframes.map((item) => ({ timeMs: frameTime(item.frame, document), value: rounded(map(item.value)), easing: item.easing }));
  if (animation.animated && (frames[0]?.timeMs ?? 0) > 0) frames.unshift({ timeMs: 0, value: rounded(map(animation.initial)), easing: "linear" });
  const unique = new Map<number, NumericFrame>(); for (const frame of frames) unique.set(frame.timeMs, frame);
  return [...unique.values()].sort((left, right) => left.timeMs - right.timeMs);
}

function componentSource(component: PaniComponent) {
  return `  component ${component.id} ${component.kind} {\n${component.properties.map(([name, value]) => `    ${name}: ${value};`).join("\n")}\n  }`;
}

function trackSource(track: PaniTrack) {
  return `    track ${track.target} {\n${track.keyframes.map((frame) => `      ${frame.timeMs}ms: ${frame.value}${frame.easing === "linear" ? "" : ` ease ${frame.easing}`};`).join("\n")}\n    }`;
}

function losslessLottieSource(document: LottieDocument, options: LottieImportOptions, report: CompatibilityItem[], summary: LottieImportSummary) {
  const externalAssets = Array.isArray(document.assets) ? document.assets.filter((asset) => isRecord(asset) && typeof asset.p === "string" && !/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(asset.p)) : [];
  if (externalAssets.length) return result(null, [...report, { source: "document.assets", disposition: "unsupported_with_error", message: "Lossless import requires image assets to be embedded data URIs; external or companion-file assets cannot be preserved inside a standalone PANI project" }], summary);
  const canonicalJson = JSON.stringify(document);
  const encoded = base64Utf8(canonicalJson);
  const packageName = safeIdentifier(options.packageName ?? document.nm?.toLowerCase() ?? "lottie_import", "lottie_import");
  const sceneName = sceneIdentifier(options.sceneName ?? document.nm ?? "ImportedLottie");
  const translatedReport: CompatibilityItem[] = report
    .filter((item) => !(item.source === "document" && item.message.startsWith("No visible layers")))
    .map((item) => item.disposition === "unsupported_with_error" ? { ...item, disposition: "converted" as const, message: `Preserved losslessly by the embedded Lottie runtime. Granular converter note: ${item.message}` } : item);
  translatedReport.unshift({ source: "document", disposition: "fully_supported", message: `Validated and preserved complete Lottie ${summary.sourceVersion ?? "JSON"} data for lossless runtime playback` });
  translatedReport.push({ source: "editable source", disposition: "converted", message: "Advanced animation data is embedded as base64 JSON in an editable PANI lottie component; safe granular layers can be translated in a future revision without the original After Effects project" });
  summary.components = 1;
  const component: PaniComponent = { id: "lottie_document", kind: "lottie", layerName: "Lottie document", properties: [["x", "0dp"], ["y", "0dp"], ["width", scalar(summary.width, "dp")], ["height", scalar(summary.height, "dp")], ["opacity", "1"], ["lottieData", stringLiteral(encoded)], ["lottieFrameRate", scalar(summary.frameRate)], ["lottieVersion", stringLiteral(summary.sourceVersion ?? "unknown")]] };
  const comments = [`// Lossless import from ${options.sourceName ?? "Lottie JSON"}.`, "// The validated original JSON is embedded below so advanced masks, parents, precompositions and shape operators remain playable without an After Effects source project."];
  const source = `language 1\npackage ${packageName};\n\n${comments.join("\n")}\nscene ${sceneName} {\n${componentSource(component)}\n\n  timeline lottie_main ${summary.durationMs}ms {\n  }\n}\n`;
  if (new TextEncoder().encode(source).length > 1_000_000) return result(null, [...report, { source: "document", disposition: "unsupported_with_error", message: "Lossless embedded Lottie source exceeds the 1 MiB PANI language 1 source limit" }], summary);
  return result(source, translatedReport, summary);
}

export function importLottie(input: string | object, options: LottieImportOptions = {}): LottieImportResult {
  const report: CompatibilityItem[] = [];
  const document = parseDocument(input, report);
  if (!document) return result(null, report, baseSummary());
  validateDocument(document, report);
  const layers = Array.isArray(document.layers) ? document.layers : [];
  const durationMs = finite(document.fr) && finite(document.ip) && finite(document.op) && document.fr > 0 ? Math.round((document.op - document.ip) / document.fr * 1_000) : 0;
  const summary: LottieImportSummary = { ...baseSummary(), sourceVersion: typeof document.v === "string" ? document.v : finite(document.ver) ? String(document.ver) : undefined, width: finite(document.w) ? document.w : 0, height: finite(document.h) ? document.h : 0, frameRate: finite(document.fr) ? document.fr : 0, durationMs, layers: layers.length };
  if (report.some((item) => item.disposition === "unsupported_with_error")) return result(null, report, summary);

  const assets = new Map<string, JsonRecord>();
  if (Array.isArray(document.assets)) for (const asset of document.assets) if (isRecord(asset) && typeof asset.id === "string") assets.set(asset.id, asset);
  const components: PaniComponent[] = [];
  const tracks: PaniTrack[] = [];
  const usedIds = new Set<string>();

  [...layers].reverse().forEach((rawLayer, reverseIndex) => {
    const index = layers.length - reverseIndex - 1;
    if (!isRecord(rawLayer)) return;
    const layerName = typeof rawLayer.nm === "string" ? rawLayer.nm : `Layer ${index + 1}`;
    const idBase = safeIdentifier(layerName, `layer_${index + 1}`);
    let layerId = idBase; let suffix = 2; while (usedIds.has(layerId)) layerId = `${idBase}_${suffix++}`;
    if (rawLayer.hd === true) { report.push({ source: layerName, disposition: "ignored_with_warning", message: "Hidden Lottie layer was intentionally omitted" }); return; }
    if (rawLayer.ef !== undefined) report.push({ source: `${layerName}.effects`, disposition: "unsupported_with_error", message: "Lottie effects cannot be translated without changing the rendered result" });
    if (rawLayer.masksProperties !== undefined || rawLayer.tt !== undefined || rawLayer.td !== undefined) report.push({ source: `${layerName}.masks`, disposition: "unsupported_with_error", message: "Masks and track mattes are not available in PANI language 1" });
    if (rawLayer.parent !== undefined) report.push({ source: `${layerName}.parent`, disposition: "unsupported_with_error", message: "Parented layer matrices must be flattened before import" });
    if (rawLayer.ddd === 1) report.push({ source: `${layerName}.3d`, disposition: "unsupported_with_error", message: "3D Lottie layers are not supported" });
    if (finite(rawLayer.sr) && rawLayer.sr !== 1) report.push({ source: `${layerName}.timeStretch`, disposition: "unsupported_with_error", message: "Time-stretched layers must be baked before import" });
    if (finite(rawLayer.bm) && rawLayer.bm !== 0) report.push({ source: `${layerName}.blendMode`, disposition: "unsupported_with_error", message: "Non-normal blend modes are not available in PANI language 1" });
    if (report.some((item) => item.disposition === "unsupported_with_error" && item.source.startsWith(layerName))) return;

    const transform = transformFor(rawLayer, layerName, report);
    const baseX = transform.x.initial - transform.anchor[0]!;
    const baseY = transform.y.initial - transform.anchor[1]!;
    const before = components.length;
    if (rawLayer.ty === 1) {
      const width = finite(rawLayer.sw) ? rawLayer.sw : document.w!; const height = finite(rawLayer.sh) ? rawLayer.sh : document.h!;
      components.push({ id: layerId, kind: "rect", layerName, properties: [["x", scalar(baseX, "dp")], ["y", scalar(baseY, "dp")], ["width", scalar(width, "dp")], ["height", scalar(height, "dp")], ["fill", colorHex(rawLayer.sc)], ["opacity", scalar(transform.opacity.initial)], ["scale", scalar(transform.scale.initial)], ["rotation", scalar(transform.rotation.initial, "deg")]] });
      usedIds.add(layerId); report.push({ source: layerName, disposition: "converted", message: "Solid layer converted to an editable PANI rectangle" });
    } else if (rawLayer.ty === 4) {
      if (!Array.isArray(rawLayer.shapes)) report.push({ source: layerName, disposition: "unsupported_with_error", message: "Shape layer has no shapes array" });
      else translateShapeItems(rawLayer.shapes, layerId, layerName, baseX, baseY, report, components, usedIds);
    } else if (rawLayer.ty === 5) {
      const textKeyframes = isRecord(rawLayer.t) && isRecord(rawLayer.t.d) && Array.isArray(rawLayer.t.d.k) ? rawLayer.t.d.k : [];
      if (textKeyframes.length > 1) report.push({ source: `${layerName}.text`, disposition: "unsupported_with_error", message: "Animated text documents must be baked before import" });
      const textData = textKeyframes.find(isRecord);
      const textDocument = textData && isRecord(textData.s) ? textData.s : undefined;
      if (!textDocument || typeof textDocument.t !== "string") report.push({ source: layerName, disposition: "unsupported_with_error", message: "Text layer has no supported text document" });
      else {
        if (rawLayer.t && isRecord(rawLayer.t) && Array.isArray(rawLayer.t.a) && rawLayer.t.a.length) report.push({ source: `${layerName}.textAnimators`, disposition: "unsupported_with_error", message: "Per-character text animators must be baked before import" });
        const box = vector(textDocument.sz, 2);
        components.push({ id: layerId, kind: "text", layerName, properties: [["text", stringLiteral(textDocument.t)], ["x", scalar(baseX, "dp")], ["y", scalar(baseY, "dp")], ["width", scalar(box?.[0] ?? document.w!, "dp")], ["color", colorHex(textDocument.fc, "#000000")], ["fontSize", scalar(finite(textDocument.s) ? textDocument.s : 24, "sp")], ["opacity", scalar(transform.opacity.initial)], ["scale", scalar(transform.scale.initial)], ["rotation", scalar(transform.rotation.initial, "deg")]] });
        usedIds.add(layerId); report.push({ source: layerName, disposition: "approximated", message: "Text content, size and color were converted; font substitution may affect metrics" });
      }
    } else if (rawLayer.ty === 2) {
      const asset = typeof rawLayer.refId === "string" ? assets.get(rawLayer.refId) : undefined;
      const source = asset && typeof asset.p === "string" && /^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:)/i.test(asset.p) ? asset.p : null;
      if (!source) report.push({ source: layerName, disposition: "unsupported_with_error", message: "Image layer must reference an embedded data URI or absolute HTTPS asset" });
      else if (new TextEncoder().encode(source).length > 512 * 1024) report.push({ source: layerName, disposition: "unsupported_with_error", message: "Embedded image exceeds the 512 KiB editable-source limit" });
      else {
        const width = asset && finite(asset.w) ? asset.w : document.w!; const height = asset && finite(asset.h) ? asset.h : document.h!;
        components.push({ id: layerId, kind: "image", layerName, properties: [["source", stringLiteral(source)], ["x", scalar(baseX, "dp")], ["y", scalar(baseY, "dp")], ["width", scalar(width, "dp")], ["height", scalar(height, "dp")], ["opacity", scalar(transform.opacity.initial)], ["scale", scalar(transform.scale.initial)], ["rotation", scalar(transform.rotation.initial, "deg")]] });
        usedIds.add(layerId); report.push({ source: layerName, disposition: "converted", message: "Image layer converted to an editable PANI image component" });
      }
    } else if (rawLayer.ty === 3) report.push({ source: layerName, disposition: "ignored_with_warning", message: "Unparented null layer has no visible content and was omitted" });
    else if (rawLayer.ty === 0) report.push({ source: layerName, disposition: "unsupported_with_error", message: "Precomposition layers must be flattened before import" });
    else if (rawLayer.ty === 13) report.push({ source: layerName, disposition: "unsupported_with_error", message: "Camera layers are not supported" });
    else report.push({ source: layerName, disposition: "unsupported_with_error", message: `Unknown or unsupported Lottie layer type ${String(rawLayer.ty)}` });

    const layerComponents = components.slice(before);
    for (const component of layerComponents) {
      if (!component.properties.some(([name]) => name === "opacity")) component.properties.push(["opacity", scalar(transform.opacity.initial)]);
      if (!component.properties.some(([name]) => name === "scale")) component.properties.push(["scale", scalar(transform.scale.initial)]);
      if (!component.properties.some(([name]) => name === "rotation")) component.properties.push(["rotation", scalar(transform.rotation.initial, "deg")]);
      const offsetX = Number(component.properties.find(([name]) => name === "x")?.[1].replace("dp", "") ?? 0) - transform.x.initial;
      const offsetY = Number(component.properties.find(([name]) => name === "y")?.[1].replace("dp", "") ?? 0) - transform.y.initial;
      const channels: Array<[string, Animatable<number>, (value: number) => number]> = [["x", transform.x, (value) => value + offsetX], ["y", transform.y, (value) => value + offsetY], ["scale", transform.scale, (value) => value], ["rotation", transform.rotation, (value) => value], ["opacity", transform.opacity, (value) => value]];
      for (const [property, animation, map] of channels) if (animation.animated) tracks.push({ target: `${component.id}.${property}`, keyframes: trackFrames(animation, document, map) });
      const layerIn = finite(rawLayer.ip) ? frameTime(rawLayer.ip, document) : 0;
      const layerOut = finite(rawLayer.op) ? frameTime(rawLayer.op, document) : durationMs;
      if ((layerIn > 0 || layerOut < durationMs) && !transform.opacity.animated) {
        const visible = rounded(transform.opacity.initial);
        tracks.push({ target: `${component.id}.opacity`, keyframes: [{ timeMs: 0, value: layerIn > 0 ? 0 : visible, easing: "steps1" }, ...(layerIn > 0 ? [{ timeMs: layerIn, value: visible, easing: "steps1" }] : []), ...(layerOut < durationMs ? [{ timeMs: layerOut, value: 0, easing: "steps1" }] : [])] });
      }
    }
  });

  summary.components = components.length;
  if (!components.length) report.push({ source: "document", disposition: "unsupported_with_error", message: "No visible layers could be translated to editable PANI components" });
  if (report.some((item) => item.disposition === "unsupported_with_error")) return options.losslessFallback === false ? result(null, report, summary) : losslessLottieSource(document, options, report, summary);
  report.unshift({ source: "document", disposition: "fully_supported", message: `Validated Lottie ${summary.sourceVersion ?? "JSON"}: ${summary.width}×${summary.height}, ${summary.frameRate} FPS, ${summary.layers} layers` });
  report.push({ source: "timing", disposition: "converted", message: `Frame timing converted to deterministic milliseconds over ${durationMs}ms` });

  const packageName = safeIdentifier(options.packageName ?? document.nm?.toLowerCase() ?? "lottie_import", "lottie_import");
  const sceneName = sceneIdentifier(options.sceneName ?? document.nm ?? "ImportedLottie");
  const comments = [`// Translated from ${options.sourceName ?? "Lottie JSON"}${summary.sourceVersion ? ` (Lottie ${summary.sourceVersion})` : ""}.`, `// Review the compatibility report before production use; the resulting source is canonical and editable.`];
  const source = `language 1\npackage ${packageName};\n\n${comments.join("\n")}\nscene ${sceneName} {\n${components.map(componentSource).join("\n\n")}\n\n  timeline lottie_main ${durationMs}ms {\n${tracks.map(trackSource).join("\n")}\n  }\n}\n`;
  if (new TextEncoder().encode(source).length > 1_000_000) {
    report.push({ source: "document", disposition: "unsupported_with_error", message: "Translated PANI source exceeds the 1 MiB compiler limit; simplify or split the Lottie document" });
    return result(null, report, summary);
  }
  return result(source, report, summary);
}

export function inspectLottie(input: string | object): LottieImportResult {
  return importLottie(input);
}

export function inspectDotLottie(bytes: Uint8Array): ImportResult {
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  return { source: null, assets: [], report: [{ source: "container", disposition: zip ? "ignored_with_warning" : "unsupported_with_error", message: zip ? "dotLottie ZIP recognized; archive extraction and manifest selection require the optional importer package" : "Input is not a ZIP-based dotLottie package" }] };
}
