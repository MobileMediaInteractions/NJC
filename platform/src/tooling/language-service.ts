import { formatAnimation } from "../animation/formatter";
import { parseAnimation } from "../animation/parser";
import { analyzeAnimation } from "../animation/semantic";
import type { AnimationProgram, Diagnostic, SourceSpan } from "../animation/types";

const docs: Record<string, string> = {
  scene: "A named renderable graph containing components, timelines, inputs, and state machines.",
  input: "A strongly typed value supplied by the host before or during playback.",
  component: "An engine-rendered or host-owned visual element.",
  timeline: "A deterministic set of property tracks evaluated against a duration.",
  track: "Keyframes targeting one supported component property.",
  machine: "A deterministic state machine that reacts to explicitly registered events.",
  reducedMotion: "A timeline substituted when the host reduced-motion policy is enabled.",
};
export const languageKeywords = ["language", "package", "scene", "input", "component", "timeline", "track", "machine", "state", "transition", "initial", "on", "play", "emit", "ease", "reducedMotion"] as const;
export type SymbolKind = "package" | "scene" | "input" | "component" | "timeline" | "machine" | "state";
export type LanguageSymbol = { name: string; kind: SymbolKind; span: SourceSpan };

function parse(source: string) { try { return { program: parseAnimation(source), error: null }; } catch (error) { return { program: null, error: error instanceof Error ? error.message : "Parse failed" }; } }
function symbols(program: AnimationProgram): LanguageSymbol[] {
  return [
    { name: program.packageName, kind: "package", span: program.span },
    ...program.scenes.flatMap((scene) => [
      { name: scene.name, kind: "scene" as const, span: scene.span },
      ...scene.inputs.map((item) => ({ name: item.name, kind: "input" as const, span: item.span })),
      ...scene.components.map((item) => ({ name: item.id, kind: "component" as const, span: item.span })),
      ...scene.timelines.map((item) => ({ name: item.name, kind: "timeline" as const, span: item.span })),
      ...scene.machines.flatMap((item) => [{ name: item.name, kind: "machine" as const, span: item.span }, ...item.states.map((state) => ({ name: state, kind: "state" as const, span: item.span }))]),
    ]),
  ];
}
function wordAt(source: string, offset: number) { const left = source.slice(0, offset).match(/[A-Za-z_][A-Za-z0-9_.-]*$/)?.[0] ?? ""; const right = source.slice(offset).match(/^[A-Za-z0-9_.-]*/)?.[0] ?? ""; return left + right; }

export class AnimationLanguageService {
  complete(source: string, offset: number) {
    const before = source.slice(Math.max(0, offset - 120), offset);
    const contextual = /component\s+\w+\s+$/.test(before) ? ["text", "rect", "path", "image", "group", "host"] : /ease\s+$/.test(before) ? ["linear", "outCubic", "inCubic", "inOutCubic", "spring", "steps4"] : [];
    return [...new Set([...contextual, ...languageKeywords])].map((label) => ({ label, documentation: docs[label] }));
  }
  hover(source: string, offset: number) { const word = wordAt(source, offset); return docs[word] ? { word, markdown: `**${word}**\n\n${docs[word]}` } : null; }
  documentSymbols(source: string) { const result = parse(source); return result.program ? symbols(result.program) : []; }
  definition(source: string, offset: number) { const result = parse(source); if (!result.program) return null; const word = wordAt(source, offset).split(".")[0] ?? ""; return symbols(result.program).find((item) => item.name === word) ?? null; }
  references(source: string, offset: number) { const word = wordAt(source, offset).split(".")[0] ?? ""; if (!word) return []; const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"); return [...source.matchAll(pattern)].map((match) => ({ start: match.index, end: (match.index ?? 0) + word.length })); }
  rename(source: string, offset: number, replacement: string) { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(replacement)) throw new Error("Replacement is not a valid identifier"); return this.references(source, offset).map((range) => ({ ...range, replacement })); }
  format(source: string) { return formatAnimation(parseAnimation(source)); }
  validate(source: string, supportedHostProperties?: ReadonlySet<string>): Diagnostic[] {
    const result = parse(source);
    if (!result.program) return [{ severity: "error", code: "PANI_PARSE", message: result.error ?? "Parse failed", span: { start: { offset: 0, line: 1, column: 1 }, end: { offset: 0, line: 1, column: 1 } } }];
    return analyzeAnimation(result.program, supportedHostProperties).diagnostics;
  }
  quickFixes(source: string) {
    const diagnostics = this.validate(source);
    return diagnostics.filter((item) => item.code === "PANI_PARSE" && /Expected ;/.test(item.message)).map((item) => ({ title: "Insert missing semicolon", offset: item.span.end.offset, text: ";" }));
  }
}
