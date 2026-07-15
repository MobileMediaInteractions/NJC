import type { AnimationProgram, ScalarValue } from "./types";
const unit = { number: "", ms: "ms", s: "s", percent: "%", dp: "dp", sp: "sp", deg: "deg" } as const;
function value(input: ScalarValue) { if (input.kind === "string") return JSON.stringify(input.value); if (input.kind === "boolean") return String(input.value); if (input.kind === "color") return input.value; return `${input.value}${unit[input.unit]}`; }
export function formatAnimation(program: AnimationProgram) {
  const lines = [`language ${program.languageVersion}`, `package ${program.packageName};`, ""];
  for (const scene of program.scenes) {
    lines.push(`scene ${scene.name} {`);
    for (const input of scene.inputs) lines.push(`  input ${input.name}: ${input.type} = ${value(input.defaultValue)};`);
    if (scene.inputs.length) lines.push("");
    for (const component of scene.components) { lines.push(`  component ${component.id} ${component.kind} {`); for (const [name, property] of Object.entries(component.properties)) lines.push(`    ${name}: ${value(property)};`); lines.push("  }", ""); }
    for (const timeline of scene.timelines) { lines.push(`  timeline ${timeline.name} ${timeline.durationMs}ms {`); for (const track of timeline.tracks) { lines.push(`    track ${track.target} {`); for (const keyframe of track.keyframes) lines.push(`      ${keyframe.timeMs}ms: ${keyframe.value}${keyframe.easing === "linear" ? "" : ` ease ${keyframe.easing}`};`); lines.push("    }"); } lines.push("  }", ""); }
    for (const machine of scene.machines) { lines.push(`  machine ${machine.name} initial ${machine.initialState} {`); for (const state of machine.states) lines.push(`    state ${state};`); for (const transition of machine.transitions) lines.push(`    transition ${transition.from} -> ${transition.to} on ${transition.event}${transition.timeline ? ` play ${transition.timeline}` : ""}${transition.emittedEvent ? ` emit ${transition.emittedEvent}` : ""};`); lines.push("  }", ""); }
    if (scene.reducedMotionTimeline) lines.push(`  reducedMotion: ${scene.reducedMotionTimeline};`);
    if (lines.at(-1) === "") lines.pop(); lines.push("}", "");
  }
  return `${lines.join("\n").trim()}\n`;
}
