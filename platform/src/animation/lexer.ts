import type { SourcePosition, SourceSpan } from "./types";

export type TokenKind = "identifier" | "number" | "string" | "color" | "symbol" | "eof";
export type Token = { kind: TokenKind; value: string; span: SourceSpan };
const symbols = new Set(["{", "}", ":", ";", "=", ",", "(", ")"]);

export function lexAnimation(source: string, limits = { maxSourceBytes: 1_000_000, maxTokens: 100_000 }) {
  if (new TextEncoder().encode(source).length > limits.maxSourceBytes) throw new Error("Animation source exceeds the configured size limit");
  const tokens: Token[] = []; let offset = 0; let line = 1; let column = 1;
  const position = (): SourcePosition => ({ offset, line, column });
  const advance = () => { const value = source[offset++]; if (value === "\n") { line += 1; column = 1; } else column += 1; return value; };
  const add = (kind: TokenKind, value: string, start: SourcePosition) => { tokens.push({ kind, value, span: { start, end: position() } }); if (tokens.length > limits.maxTokens) throw new Error("Animation source exceeds the token limit"); };
  while (offset < source.length) {
    const char = source[offset]; if (/\s/.test(char ?? "")) { advance(); continue; }
    if (char === "/" && source[offset + 1] === "/") { while (offset < source.length && source[offset] !== "\n") advance(); continue; }
    const start = position();
    if (source.slice(offset, offset + 2) === "->") { advance(); advance(); add("symbol", "->", start); continue; }
    if (symbols.has(char ?? "")) { add("symbol", advance() ?? "", start); continue; }
    if (char === '"') { advance(); let value = ""; while (offset < source.length && source[offset] !== '"') { const next = advance(); if (next === "\\") { const escaped = advance(); value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped; } else value += next; } if (source[offset] !== '"') throw new Error(`Unterminated string at ${start.line}:${start.column}`); advance(); add("string", value, start); continue; }
    if (char === "#") { let value = advance() ?? ""; while (/[0-9a-fA-F]/.test(source[offset] ?? "")) value += advance(); if (![4, 7, 9].includes(value.length)) throw new Error(`Invalid color at ${start.line}:${start.column}`); add("color", value.toUpperCase(), start); continue; }
    if (/[0-9.-]/.test(char ?? "") && /[0-9]/.test(source[offset + (char === "-" ? 1 : 0)] ?? "")) { let value = ""; if (char === "-") value += advance(); while (/[0-9.]/.test(source[offset] ?? "")) value += advance(); while (/[A-Za-z%]/.test(source[offset] ?? "")) value += advance(); add("number", value, start); continue; }
    if (/[A-Za-z_]/.test(char ?? "")) { let value = ""; while (/[A-Za-z0-9_.-]/.test(source[offset] ?? "")) value += advance(); add("identifier", value, start); continue; }
    throw new Error(`Unexpected character ${JSON.stringify(char)} at ${line}:${column}`);
  }
  const end = position(); tokens.push({ kind: "eof", value: "", span: { start: end, end } }); return tokens;
}
