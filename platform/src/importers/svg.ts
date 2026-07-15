import type { ImportResult } from "./types";

const number = (value: string | undefined, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const attribute = (tag: string, name: string) => new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
const safeName = (value: string, index: number) => (value.replace(/[^A-Za-z0-9_]/g, "_").replace(/^[^A-Za-z_]/, "_") || `item_${index}`);

export function importSvg(svg: string, packageName = "svg_import"): ImportResult {
  if (Buffer.byteLength(svg) > 5_000_000) return { source: null, assets: [], report: [{ source: "document", disposition: "unsupported_with_error", message: "SVG exceeds the 5 MB importer limit" }] };
  if (!/<svg\b/i.test(svg)) return { source: null, assets: [], report: [{ source: "document", disposition: "unsupported_with_error", message: "Input is not an SVG document" }] };
  const report: ImportResult["report"] = [];
  if (/<script\b|\son\w+\s*=|javascript:/i.test(svg)) report.push({ source: "active content", disposition: "ignored_with_warning", message: "Scripts and event attributes are never imported" });
  for (const match of svg.matchAll(/<(filter|foreignObject|animate|set|fe\w+)\b/gi)) report.push({ source: match[1] ?? "effect", disposition: "unsupported_with_error", message: "Effect requires rasterization or manual recreation" });
  const components: string[] = [];
  let index = 0;
  for (const match of svg.matchAll(/<(path|rect|image)\b[^>]*>/gi)) {
    const tag = match[0]; const kind = match[1]?.toLowerCase(); const id = safeName(attribute(tag, "id") ?? `${kind}_${index}`, index++);
    if (kind === "path") {
      const path = attribute(tag, "d");
      if (!path) { report.push({ source: id, disposition: "ignored_with_warning", message: "Path has no d attribute" }); continue; }
      const fill = attribute(tag, "fill") ?? "#000000";
      components.push(`  component ${id} path {\n    path: ${JSON.stringify(path)};\n    fill: ${/^#[0-9a-f]{3,8}$/i.test(fill) ? fill : JSON.stringify(fill)};\n  }`);
      report.push({ source: id, disposition: "converted", message: "Static SVG path converted to an engine path component" });
    } else if (kind === "rect") {
      components.push(`  component ${id} rect {\n    x: ${number(attribute(tag, "x"))}dp;\n    y: ${number(attribute(tag, "y"))}dp;\n    width: ${number(attribute(tag, "width"))}dp;\n    height: ${number(attribute(tag, "height"))}dp;\n    fill: ${attribute(tag, "fill") ?? "#000000"};\n  }`);
      report.push({ source: id, disposition: "fully_supported", message: "Rectangle converted without loss" });
    } else {
      report.push({ source: id, disposition: "ignored_with_warning", message: "External SVG images require an explicit asset resolver" });
    }
  }
  if (!components.length) report.push({ source: "document", disposition: "unsupported_with_error", message: "No supported path or rectangle elements were found" });
  const source = components.length ? `language 1\npackage ${safeName(packageName, 0)};\n\nscene ImportedSvg {\n${components.join("\n\n")}\n}` : null;
  return { source, report, assets: [] };
}
