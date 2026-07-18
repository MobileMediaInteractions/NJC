import type { AnimationProgram, Diagnostic, ScalarValue } from "./types";

const componentKinds = new Set(["text", "rect", "path", "image", "lottie", "group", "host"]);
const sharedProperties = new Set([
  "opacity", "x", "y", "scale", "rotation", "width", "height", "fill", "color",
  "cornerRadius", "text", "path", "hostId", "source", "fontSize", "fontWeight",
  "strokeWidth", "pathMode", "lottieData", "lottieFrameRate", "lottieVersion",
]);
function diagnostic(code: string, message: string, span: Diagnostic["span"]): Diagnostic { return { severity: "error", code, message, span }; }
function scalarMatches(type: string, value: ScalarValue) { if (type === "string") return value.kind === "string"; if (type === "boolean") return value.kind === "boolean"; if (type === "color") return value.kind === "color"; if (["number", "integer", "duration", "percentage", "angle"].includes(type)) return value.kind === "number"; return false; }
export function analyzeAnimation(program: AnimationProgram, targetHostProperties: ReadonlySet<string> = sharedProperties) {
  const diagnostics: Diagnostic[] = []; const sceneNames = new Set<string>();
  if (!program.scenes.length) diagnostics.push(diagnostic("P100", "A package must contain at least one scene.", program.span));
  for (const scene of program.scenes) {
    if (sceneNames.has(scene.name)) diagnostics.push(diagnostic("P101", `Duplicate scene ${scene.name}.`, scene.span)); sceneNames.add(scene.name);
    const components = new Map(scene.components.map((item) => [item.id, item])); const timelines = new Map(scene.timelines.map((item) => [item.name, item]));
    if (components.size !== scene.components.length) diagnostics.push(diagnostic("P102", "Component identifiers must be unique within a scene.", scene.span));
    for (const input of scene.inputs) if (!scalarMatches(input.type, input.defaultValue)) diagnostics.push(diagnostic("P110", `Input ${input.name} default does not match ${input.type}.`, input.span));
    for (const component of scene.components) { if (!componentKinds.has(component.kind)) diagnostics.push(diagnostic("P120", `Unsupported component kind ${component.kind}.`, component.span)); for (const property of Object.keys(component.properties)) if (!sharedProperties.has(property)) diagnostics.push(diagnostic("P121", `Unknown property ${component.id}.${property}.`, component.span)); if (component.kind === "host") for (const property of Object.keys(component.properties)) if (property !== "hostId" && !targetHostProperties.has(property)) diagnostics.push(diagnostic("P122", `Host adapter does not support ${property}.`, component.span)); }
    for (const timeline of scene.timelines) { if (timeline.durationMs < 0) diagnostics.push(diagnostic("P130", `Timeline ${timeline.name} has invalid duration.`, timeline.span)); for (const track of timeline.tracks) { const [componentId, property] = track.target.split("."); if (!componentId || !property || !components.has(componentId)) diagnostics.push(diagnostic("P131", `Track target ${track.target} does not resolve.`, track.span)); else if (!targetHostProperties.has(property)) diagnostics.push(diagnostic("P132", `Target property ${property} is unsupported by this adapter.`, track.span)); let last = -Infinity; for (const keyframe of track.keyframes) { if (keyframe.timeMs < last || keyframe.timeMs > timeline.durationMs) diagnostics.push(diagnostic("P133", `Keyframes for ${track.target} must be ordered within the timeline duration.`, keyframe.span)); last = keyframe.timeMs; } } }
    for (const machine of scene.machines) { if (!machine.states.includes(machine.initialState)) diagnostics.push(diagnostic("P140", `Machine ${machine.name} initial state is undeclared.`, machine.span)); for (const transition of machine.transitions) { if (!machine.states.includes(transition.from) || !machine.states.includes(transition.to)) diagnostics.push(diagnostic("P141", `Transition ${transition.from} -> ${transition.to} references an undeclared state.`, transition.span)); if (transition.timeline && !timelines.has(transition.timeline)) diagnostics.push(diagnostic("P142", `Transition timeline ${transition.timeline} does not exist.`, transition.span)); } }
    if (scene.reducedMotionTimeline && !timelines.has(scene.reducedMotionTimeline)) diagnostics.push(diagnostic("P150", `Reduced-motion timeline ${scene.reducedMotionTimeline} does not exist.`, scene.span));
  }
  return { ok: !diagnostics.some((item) => item.severity === "error"), diagnostics, program };
}
