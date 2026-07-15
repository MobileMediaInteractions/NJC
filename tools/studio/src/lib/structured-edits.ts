import { lexAnimation } from "@platform/runtime/animation";

export type ScalarInput = string | number | boolean;

function literal(value: ScalarInput, previousTokenKind: string, unit = "") {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return `${Number.isFinite(value) ? value : 0}${unit}`;
  if (previousTokenKind === "color" && /^#[0-9a-f]{3,8}$/i.test(value)) return value.toUpperCase();
  return JSON.stringify(value);
}

export function updateComponentProperty(source: string, componentId: string, property: string, value: ScalarInput) {
  const tokens = lexAnimation(source);
  for (let index = 0; index < tokens.length - 3; index += 1) {
    if (tokens[index]?.value !== "component" || tokens[index + 1]?.value !== componentId) continue;
    let cursor = index + 3;
    if (tokens[cursor]?.value !== "{") throw new Error(`Component ${componentId} has no body`);
    cursor += 1;
    let closingOffset = -1;
    while (cursor < tokens.length) {
      const token = tokens[cursor];
      if (!token) break;
      if (token.value === "}") { closingOffset = token.span.start.offset; break; }
      const colon = tokens[cursor + 1];
      const scalar = tokens[cursor + 2];
      if (token.value === property && colon?.value === ":" && scalar) {
        const raw = source.slice(scalar.span.start.offset, scalar.span.end.offset);
        const unit = typeof value === "number" ? raw.match(/[A-Za-z%]+$/)?.[0] ?? "" : "";
        return source.slice(0, scalar.span.start.offset) + literal(value, scalar.kind, unit) + source.slice(scalar.span.end.offset);
      }
      cursor += 1;
    }
    if (closingOffset >= 0) {
      return `${source.slice(0, closingOffset)}  ${property}: ${literal(value, typeof value === "string" && value.startsWith("#") ? "color" : "string")};\n${source.slice(closingOffset)}`;
    }
  }
  throw new Error(`Component ${componentId} was not found`);
}

export function updateKeyframe(source: string, target: string, keyframeIndex: number, field: "time" | "value" | "easing", value: number | string) {
  const tokens = lexAnimation(source);
  for (let index = 0; index < tokens.length - 2; index += 1) {
    if (tokens[index]?.value !== "track" || tokens[index + 1]?.value !== target || tokens[index + 2]?.value !== "{") continue;
    let cursor = index + 3;
    let frame = 0;
    while (tokens[cursor] && tokens[cursor]?.value !== "}") {
      const time = tokens[cursor];
      const colon = tokens[cursor + 1];
      const scalar = tokens[cursor + 2];
      if (time?.kind !== "number" || colon?.value !== ":" || scalar?.kind !== "number") break;
      const easeKeyword = tokens[cursor + 3];
      const easing = tokens[cursor + 4];
      if (frame === keyframeIndex) {
        if (field === "time") {
          const replacement = `${Math.max(0, Number(value))}ms`;
          return source.slice(0, time.span.start.offset) + replacement + source.slice(time.span.end.offset);
        }
        if (field === "value") {
          return source.slice(0, scalar.span.start.offset) + String(Number(value)) + source.slice(scalar.span.end.offset);
        }
        if (easeKeyword?.value === "ease" && easing) {
          return source.slice(0, easing.span.start.offset) + String(value) + source.slice(easing.span.end.offset);
        }
        const insertAt = scalar.span.end.offset;
        return source.slice(0, insertAt) + ` ease ${String(value)}` + source.slice(insertAt);
      }
      while (tokens[cursor] && tokens[cursor]?.value !== ";") cursor += 1;
      cursor += 1;
      frame += 1;
    }
  }
  throw new Error(`Keyframe ${keyframeIndex + 1} on ${target} was not found`);
}
