import { sha256Hex } from "../core/sha256";
import { encodeAnimationFlatbuffer, wrapAnimationPackage } from "./binary";
import { formatAnimation } from "./formatter";
import { parseAnimation } from "./parser";
import { analyzeAnimation } from "./semantic";
import type { CompiledAnimation } from "./types";

export const compilerVersion = "0.1.0";
export function compileAnimation(source: string, options: { minimumRuntime?: string; supportedHostProperties?: ReadonlySet<string> } = {}) {
  const program = parseAnimation(source); const analysis = analyzeAnimation(program, options.supportedHostProperties);
  if (!analysis.ok) throw new Error(analysis.diagnostics.map((item) => `${item.code} ${item.message} (${item.span.start.line}:${item.span.start.column})`).join("\n"));
  const canonicalSource = formatAnimation(program); const required = new Set(["animation.core"]); if (program.scenes.some((scene) => scene.machines.length)) required.add("animation.state-machine"); if (program.scenes.some((scene) => scene.components.some((component) => component.kind === "host"))) required.add("animation.host-view"); if (program.scenes.some((scene) => scene.components.some((component) => component.kind === "lottie"))) required.add("animation.lottie");
  const compiled: CompiledAnimation = { schemaVersion: 1, minimumRuntime: options.minimumRuntime ?? "0.1.0", compilerVersion, sourceHash: sha256Hex(canonicalSource), scenes: program.scenes, requiredFeatures: [...required].sort() };
  const flatbuffer = encodeAnimationFlatbuffer(compiled); return { packageBytes: wrapAnimationPackage(flatbuffer), flatbuffer, compiled, canonicalSource, diagnostics: analysis.diagnostics };
}
