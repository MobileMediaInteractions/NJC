import { componentDefinition, validateFeature, walkComponents, type BehaviorFlow, type BehaviorNode, type FeatureDiagnostic, type FeatureIR, type SourceRange } from "@visual-feature/model";

export type ParsedFeature = { feature: FeatureIR; diagnostics: FeatureDiagnostic[] };
export type FeatureSymbol = { name: string; kind: "feature" | "data" | "state" | "screen" | "component" | "behavior" | "motion" | "connector"; objectId: string; range: SourceRange };

const quote = (value: unknown) => JSON.stringify(String(value));
const indent = (depth: number) => "  ".repeat(depth);
const componentKeyword = (type: string) => type.replace("text-field", "text field").replace("navigation-bar", "navigation bar");

function componentLine(component: ReturnType<typeof walkComponents>[number], depth: number) {
  const definition = componentDefinition(component.type);
  const textProperty = component.type === "button" ? "label" : component.type === "heading" || component.type === "text" ? "text" : component.type === "image" || component.type === "video" ? "source" : component.type === "modal" ? "title" : undefined;
  const phrase = textProperty && component.properties[textProperty] !== undefined
    ? `${component.type === "button" ? " saying" : component.type === "image" || component.type === "video" ? " showing" : " showing"} ${quote(component.properties[textProperty])}`
    : "";
  const hidden = component.properties.visible === false ? " hidden" : "";
  const label = definition ? componentKeyword(definition.type) : componentKeyword(component.type);
  return `${indent(depth)}Add ${label} ${component.name}${phrase}${hidden} with id ${quote(component.id)}`;
}

function formatBehaviorNode(node: BehaviorNode, flow: BehaviorFlow, depth: number, visited: Set<string>): string[] {
  if (visited.has(node.id)) return [];
  visited.add(node.id);
  const lines: string[] = [];
  const at = indent(depth);
  if (node.kind === "set-state") lines.push(`${at}Set ${String(node.config.state)} to ${String(node.config.value)}`);
  if (node.kind === "show") lines.push(`${at}Show ${String(node.config.componentId).split(".").at(-1) ?? node.label}`);
  if (node.kind === "hide") lines.push(`${at}Hide ${String(node.config.componentId).split(".").at(-1) ?? node.label}`);
  if (node.kind === "animation") lines.push(`${at}Play animation ${String(node.config.motionId).split(".").at(-1) ?? node.label}`);
  if (node.kind === "navigate") lines.push(`${at}Navigate to screen ${String(node.config.screen ?? "UnknownScreen")}`);
  if (node.kind === "wait") lines.push(`${at}Wait for ${String(node.config.duration ?? "0ms")}`);
  if (node.kind === "ask") {
    lines.push(`${at}Ask ${quote(node.config.message)} with modal ${String(node.config.modalId)}`);
    lines.push(`${at}  Use title ${quote(node.config.title)}`);
    lines.push(`${at}  Use confirm button ${quote(node.config.confirm)}`);
    lines.push(`${at}  Use cancel button ${quote(node.config.cancel)}`);
    const confirmed = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "confirmed");
    const cancelled = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "cancelled");
    if (confirmed) {
      lines.push(`${at}If the reader confirms:`);
      const target = flow.nodes.find((item) => item.id === confirmed.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    if (cancelled) {
      lines.push(`${at}Otherwise:`);
      const target = flow.nodes.find((item) => item.id === cancelled.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    return lines;
  }
  if (node.kind === "action") {
    const result = String(node.config.result ?? "result");
    lines.push(`${at}Call ${String(node.config.connectorId)}.${String(node.config.operationId)} with ${String(node.config.input)} -> ${result}`);
    const success = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "success");
    const failure = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "failure");
    if (success) {
      lines.push(`${at}If ${result} succeeds:`);
      const target = flow.nodes.find((item) => item.id === success.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    if (failure) {
      lines.push(`${at}Otherwise:`);
      const target = flow.nodes.find((item) => item.id === failure.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    return lines;
  }
  const next = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "next");
  if (next) {
    const target = flow.nodes.find((item) => item.id === next.toNodeId);
    if (target) lines.push(...formatBehaviorNode(target, flow, depth, visited));
  }
  return lines;
}

export function formatFeatureSource(feature: FeatureIR) {
  const lines: string[] = [`Create feature ${feature.name.replaceAll(" ", "")} version ${feature.version} with id ${quote(feature.id)}`, "", "This feature requires:"];
  feature.capabilities.forEach((capability) => lines.push(`  capability ${capability}`));
  lines.push(`  entitlement ${quote(feature.entitlement)}`);
  for (const model of feature.dataModels) {
    lines.push("", `Define data ${model.name} with id ${quote(model.id)}`);
    model.fields.forEach((field) => lines.push(`  field ${field.name} is ${field.type}${field.optional ? "?" : ""} with id ${quote(field.id)}`));
  }
  lines.push("", "Remember these state values:");
  feature.state.forEach((field) => lines.push(`  state ${field.name} is ${field.type} scoped to ${field.scope}${field.initialValue !== undefined ? ` = ${JSON.stringify(field.initialValue)}` : ""} with id ${quote(field.id)}`));
  for (const screen of feature.screens) {
    lines.push("", `Show screen ${screen.name} at route ${quote(screen.route)} with id ${quote(screen.id)}`);
    const write = (component: typeof screen.root, depth: number) => { lines.push(componentLine(component, depth)); component.children.forEach((child) => write(child, depth + 1)); };
    write(screen.root, 1);
  }
  for (const flow of feature.behaviors) {
    const triggerComponent = walkComponents(feature).find((item) => item.id === flow.trigger.componentId);
    lines.push("", `When ${triggerComponent?.name ?? flow.trigger.componentId} is ${flow.trigger.event}:`);
    const event = flow.nodes.find((item) => item.kind === "event");
    const next = event && flow.edges.find((item) => item.fromNodeId === event.id && item.fromPortId === "next");
    const first = next && flow.nodes.find((item) => item.id === next.toNodeId);
    if (first) lines.push(...formatBehaviorNode(first, flow, 1, new Set(event ? [event.id] : [])));
  }
  for (const motion of feature.motions) {
    lines.push("", `Define motion ${motion.name} lasting ${motion.durationMs}ms with id ${quote(motion.id)}`);
    for (const track of motion.tracks) {
      const component = walkComponents(feature).find((item) => item.id === track.targetComponentId);
      lines.push(`  Animate ${component?.name ?? track.targetComponentId}.${track.property} with id ${quote(track.id)}`);
      track.keyframes.forEach((keyframe) => lines.push(`    At ${keyframe.timeMs}ms set value to ${keyframe.value} using ${keyframe.interpolation} with id ${quote(keyframe.id)}`));
    }
  }
  return `${lines.join("\n")}\n`;
}

function rangeForLine(source: string, lineIndex: number, startColumn = 1, length = 1): SourceRange {
  const lines = source.split("\n");
  const offset = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0) + startColumn - 1;
  return { start: { offset, line: lineIndex + 1, column: startColumn }, end: { offset: offset + length, line: lineIndex + 1, column: startColumn + length } };
}

const clone = <T>(value: T): T => structuredClone(value);
const stringValue = (value: string) => { try { return JSON.parse(value) as string; } catch { return value.replace(/^"|"$/g, ""); } };

export function parseFeatureSource(source: string, baseFeature: FeatureIR): ParsedFeature {
  const feature = clone(baseFeature);
  const diagnostics: FeatureDiagnostic[] = [];
  const lines = source.replaceAll("\t", "  ").split("\n");
  const components = walkComponents(feature);
  let activeAsk: BehaviorNode | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]!; const text = raw.trim();
    if (!text || text.startsWith("#")) continue;
    const header = /^(?:Create\s+)?feature\s+([A-Za-z][\w-]*)\s+version\s+(\d+\.\d+\.\d+(?:-[\w.-]+)?)\s+(?:with\s+)?id\s+"([a-z][a-z0-9.-]+)"$/i.exec(text);
    if (header) { feature.name = header[1]!.replace(/([a-z])([A-Z])/g, "$1 $2"); feature.version = header[2]!; feature.id = header[3]!; continue; }
    const componentMatch = /^(?:Add\s+)?(?:vertical\s+)?(?:stack|row|heading|text|button|image|video|text field|list|card|modal|spinner|badge|navigation bar)\s+([A-Za-z][\w-]*)(?:\s+(?:saying|showing)\s+("(?:[^"\\]|\\.)*"))?(?:\s+hidden)?\s+(?:with\s+)?id\s+"([a-z][a-z0-9.-]+)"$/i.exec(text);
    if (componentMatch && componentMatch[3]?.startsWith("component.")) {
      const component = components.find((item) => item.id === componentMatch[3]);
      if (!component) diagnostics.push({ severity: "error", code: "FEATURE_SOURCE_COMPONENT", message: `Source references unknown component '${componentMatch[3]}'.`, range: rangeForLine(source, index, 1, raw.length) });
      else if (componentMatch[2]) {
        const key = component.type === "button" ? "label" : component.type === "image" || component.type === "video" ? "source" : component.type === "modal" ? "title" : "text";
        component.properties[key] = stringValue(componentMatch[2]);
      }
      continue;
    }
    const ask = /^ask\s+("(?:[^"\\]|\\.)*")\s+(?:using|with\s+modal)\s+([a-zA-Z0-9.-]+)$/i.exec(text);
    if (ask) {
      activeAsk = feature.behaviors.flatMap((flow) => flow.nodes).find((item) => item.kind === "ask" && String(item.config.modalId) === ask[2]);
      if (!activeAsk) diagnostics.push({ severity: "error", code: "FEATURE_SOURCE_ASK", message: `No confirmation node uses '${ask[2]}'.`, range: rangeForLine(source, index, 1, raw.length) });
      else activeAsk.config.message = stringValue(ask[1]!);
      continue;
    }
    const askOption = /^(?:Use\s+)?(title|confirm(?:\s+button)?|cancel(?:\s+button)?)\s+("(?:[^"\\]|\\.)*")$/i.exec(text);
    if (askOption && activeAsk) {
      const option = askOption[1]!.toLowerCase();
      const key = option.startsWith("confirm") ? "confirm" : option.startsWith("cancel") ? "cancel" : "title";
      activeAsk.config[key] = stringValue(askOption[2]!);
      continue;
    }
    const stateSet = /^set\s+([A-Za-z][\w-]*)\s*(?:=|to)\s*([A-Za-z0-9_.-]+)$/i.exec(text);
    if (stateSet) {
      const stateNode = feature.behaviors.flatMap((flow) => flow.nodes).find((item) => item.kind === "set-state" && item.config.state === stateSet[1] && item.config.value === stateSet[2]);
      if (!stateNode) diagnostics.push({ severity: "warning", code: "FEATURE_SOURCE_STRUCTURE", message: `The vertical slice cannot yet add a new state action from source: '${text}'.`, range: rangeForLine(source, index, 1, raw.length) });
      continue;
    }
    if (/^(?:This feature requires:|Remember these state values:|requires|capability\s|entitlement\s|state\s|data\s|Define data\s|screen\s|Show screen\s|when\s|if\s|otherwise:?$|call\s|show\s|hide\s|play\s|navigate\s|wait\s|motion\s|Define motion\s|animate\s|at\s|field\s|[a-z][a-z0-9-]*$)/i.test(text) || /\s(?:with\s+)?id\s+"[a-z][a-z0-9.-]+"$/i.test(text)) continue;
    diagnostics.push({ severity: "error", code: "FEATURE_SOURCE_SYNTAX", message: `Unsupported controlled-language statement '${text}'.`, range: rangeForLine(source, index, 1, raw.length) });
  }
  diagnostics.push(...validateFeature(feature));
  return { feature, diagnostics };
}

export function featureSymbols(source: string): FeatureSymbol[] {
  const symbols: FeatureSymbol[] = [];
  source.split("\n").forEach((line, index) => {
    const declaration = /^\s*(?:(?:Create|Define|Show)\s+)?(feature|data|screen|motion)\s+([A-Za-z][\w-]*).*?\s(?:with\s+)?id\s+"([a-z][a-z0-9.-]+)"/i.exec(line);
    const component = /^\s*(?:Add\s+)?(?:vertical\s+)?(?:stack|row|heading|text|button|image|video|text field|list|card|modal|spinner|badge|navigation bar)\s+([A-Za-z][\w-]*).*?\s(?:with\s+)?id\s+"([a-z][a-z0-9.-]+)"/i.exec(line);
    const behavior = /^\s*when\s+([A-Za-z][\w-]*)\s+is\s+([a-z-]+):?/i.exec(line);
    if (declaration) symbols.push({ name: declaration[2]!, kind: declaration[1]!.toLowerCase() as FeatureSymbol["kind"], objectId: declaration[3]!, range: rangeForLine(source, index, line.indexOf(declaration[2]!) + 1, declaration[2]!.length) });
    else if (component) symbols.push({ name: component[1]!, kind: "component", objectId: component[2]!, range: rangeForLine(source, index, line.indexOf(component[1]!) + 1, component[1]!.length) });
    else if (behavior) symbols.push({ name: `${behavior[1]} ${behavior[2]}`, kind: "behavior", objectId: `${behavior[1]}.${behavior[2]}`, range: rangeForLine(source, index, line.indexOf(behavior[1]!) + 1, behavior[1]!.length) });
  });
  return symbols;
}

export class FeatureLanguageService {
  format(source: string) { return `${source.split("\n").map((line) => line.replaceAll("\t", "  ").replace(/\s+$/g, "")).join("\n").trim()}\n`; }
  symbols(source: string) { return featureSymbols(source); }
  complete(prefix: string) {
    const keywords = ["when", "if", "otherwise", "show", "hide", "ask", "set", "call", "navigate", "play", "wait", "create", "define", "remember", "requires", "capability", "data", "state", "screen", "motion"];
    return keywords.filter((item) => item.startsWith(prefix.toLowerCase()));
  }
  definition(source: string, name: string) { return featureSymbols(source).find((item) => item.name === name)?.range; }
}
