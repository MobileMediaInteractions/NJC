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
  return `${indent(depth)}${label} ${component.name}${phrase}${hidden} id ${quote(component.id)}`;
}

function formatBehaviorNode(node: BehaviorNode, flow: BehaviorFlow, depth: number, visited: Set<string>): string[] {
  if (visited.has(node.id)) return [];
  visited.add(node.id);
  const lines: string[] = [];
  const at = indent(depth);
  if (node.kind === "set-state") lines.push(`${at}set ${String(node.config.state)} = ${String(node.config.value)}`);
  if (node.kind === "show") lines.push(`${at}show ${String(node.config.componentId).split(".").at(-1) ?? node.label}`);
  if (node.kind === "hide") lines.push(`${at}hide ${String(node.config.componentId).split(".").at(-1) ?? node.label}`);
  if (node.kind === "animation") lines.push(`${at}play ${String(node.config.motionId).split(".").at(-1) ?? node.label}`);
  if (node.kind === "navigate") lines.push(`${at}navigate to ${String(node.config.screen ?? "UnknownScreen")}`);
  if (node.kind === "wait") lines.push(`${at}wait ${String(node.config.duration ?? "0ms")}`);
  if (node.kind === "ask") {
    lines.push(`${at}ask ${quote(node.config.message)} using ${String(node.config.modalId)}`);
    lines.push(`${at}  title ${quote(node.config.title)}`);
    lines.push(`${at}  confirm ${quote(node.config.confirm)}`);
    lines.push(`${at}  cancel ${quote(node.config.cancel)}`);
    const confirmed = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "confirmed");
    const cancelled = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "cancelled");
    if (confirmed) {
      lines.push(`${at}if confirmed`);
      const target = flow.nodes.find((item) => item.id === confirmed.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    if (cancelled) {
      lines.push(`${at}otherwise`);
      const target = flow.nodes.find((item) => item.id === cancelled.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    return lines;
  }
  if (node.kind === "action") {
    const result = String(node.config.result ?? "result");
    lines.push(`${at}call ${String(node.config.connectorId)}.${String(node.config.operationId)} using ${String(node.config.input)} as ${result}`);
    const success = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "success");
    const failure = flow.edges.find((edge) => edge.fromNodeId === node.id && edge.fromPortId === "failure");
    if (success) {
      lines.push(`${at}if ${result} succeeds`);
      const target = flow.nodes.find((item) => item.id === success.toNodeId);
      if (target) lines.push(...formatBehaviorNode(target, flow, depth + 1, visited));
    }
    if (failure) {
      lines.push(`${at}otherwise`);
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
  const lines: string[] = [`feature ${feature.name.replaceAll(" ", "")} version ${feature.version} id ${quote(feature.id)}`, "", "requires"];
  feature.capabilities.forEach((capability) => lines.push(`  ${capability}`));
  lines.push(`  entitlement ${quote(feature.entitlement)}`);
  for (const model of feature.dataModels) {
    lines.push("", `data ${model.name} id ${quote(model.id)}`);
    model.fields.forEach((field) => lines.push(`  ${field.name} ${field.type}${field.optional ? "?" : ""} id ${quote(field.id)}`));
  }
  lines.push("", "state");
  feature.state.forEach((field) => lines.push(`  ${field.name} ${field.type} scope ${field.scope}${field.initialValue !== undefined ? ` = ${JSON.stringify(field.initialValue)}` : ""} id ${quote(field.id)}`));
  for (const screen of feature.screens) {
    lines.push("", `screen ${screen.name} route ${quote(screen.route)} id ${quote(screen.id)}`);
    const write = (component: typeof screen.root, depth: number) => { lines.push(componentLine(component, depth)); component.children.forEach((child) => write(child, depth + 1)); };
    write(screen.root, 1);
  }
  for (const flow of feature.behaviors) {
    const triggerComponent = walkComponents(feature).find((item) => item.id === flow.trigger.componentId);
    lines.push("", `when ${triggerComponent?.name ?? flow.trigger.componentId} is ${flow.trigger.event}`);
    const event = flow.nodes.find((item) => item.kind === "event");
    const next = event && flow.edges.find((item) => item.fromNodeId === event.id && item.fromPortId === "next");
    const first = next && flow.nodes.find((item) => item.id === next.toNodeId);
    if (first) lines.push(...formatBehaviorNode(first, flow, 1, new Set(event ? [event.id] : [])));
  }
  for (const motion of feature.motions) {
    lines.push("", `motion ${motion.name} duration ${motion.durationMs}ms id ${quote(motion.id)}`);
    for (const track of motion.tracks) {
      const component = walkComponents(feature).find((item) => item.id === track.targetComponentId);
      lines.push(`  animate ${component?.name ?? track.targetComponentId}.${track.property} id ${quote(track.id)}`);
      track.keyframes.forEach((keyframe) => lines.push(`    at ${keyframe.timeMs}ms value ${keyframe.value} using ${keyframe.interpolation} id ${quote(keyframe.id)}`));
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
    const header = /^feature\s+([A-Za-z][\w-]*)\s+version\s+(\d+\.\d+\.\d+(?:-[\w.-]+)?)\s+id\s+"([a-z][a-z0-9.-]+)"$/.exec(text);
    if (header) { feature.name = header[1]!.replace(/([a-z])([A-Z])/g, "$1 $2"); feature.version = header[2]!; feature.id = header[3]!; continue; }
    const componentMatch = /^(?:vertical\s+)?(?:stack|row|heading|text|button|image|video|text field|list|card|modal|spinner|badge|navigation bar)\s+([A-Za-z][\w-]*)(?:\s+(?:saying|showing)\s+("(?:[^"\\]|\\.)*"))?(?:\s+hidden)?\s+id\s+"([a-z][a-z0-9.-]+)"$/.exec(text);
    if (componentMatch && componentMatch[3]?.startsWith("component.")) {
      const component = components.find((item) => item.id === componentMatch[3]);
      if (!component) diagnostics.push({ severity: "error", code: "FEATURE_SOURCE_COMPONENT", message: `Source references unknown component '${componentMatch[3]}'.`, range: rangeForLine(source, index, 1, raw.length) });
      else if (componentMatch[2]) {
        const key = component.type === "button" ? "label" : component.type === "image" || component.type === "video" ? "source" : component.type === "modal" ? "title" : "text";
        component.properties[key] = stringValue(componentMatch[2]);
      }
      continue;
    }
    const ask = /^ask\s+("(?:[^"\\]|\\.)*")\s+using\s+([a-zA-Z0-9.-]+)$/.exec(text);
    if (ask) {
      activeAsk = feature.behaviors.flatMap((flow) => flow.nodes).find((item) => item.kind === "ask" && String(item.config.modalId) === ask[2]);
      if (!activeAsk) diagnostics.push({ severity: "error", code: "FEATURE_SOURCE_ASK", message: `No confirmation node uses '${ask[2]}'.`, range: rangeForLine(source, index, 1, raw.length) });
      else activeAsk.config.message = stringValue(ask[1]!);
      continue;
    }
    const askOption = /^(title|confirm|cancel)\s+("(?:[^"\\]|\\.)*")$/.exec(text);
    if (askOption && activeAsk) { activeAsk.config[askOption[1]!] = stringValue(askOption[2]!); continue; }
    const stateSet = /^set\s+([A-Za-z][\w-]*)\s*=\s*([A-Za-z0-9_.-]+)$/.exec(text);
    if (stateSet) {
      const stateNode = feature.behaviors.flatMap((flow) => flow.nodes).find((item) => item.kind === "set-state" && item.config.state === stateSet[1] && item.config.value === stateSet[2]);
      if (!stateNode) diagnostics.push({ severity: "warning", code: "FEATURE_SOURCE_STRUCTURE", message: `The vertical slice cannot yet add a new state action from source: '${text}'.`, range: rangeForLine(source, index, 1, raw.length) });
      continue;
    }
    if (/^(requires|entitlement\s|state|data\s|screen\s|when\s|if\s|otherwise$|call\s|show\s|hide\s|play\s|motion\s|animate\s|at\s|[a-z][a-z0-9-]*$)/.test(text) || /\sid\s+"[a-z][a-z0-9.-]+"$/.test(text)) continue;
    diagnostics.push({ severity: "error", code: "FEATURE_SOURCE_SYNTAX", message: `Unsupported controlled-language statement '${text}'.`, range: rangeForLine(source, index, 1, raw.length) });
  }
  diagnostics.push(...validateFeature(feature));
  return { feature, diagnostics };
}

export function featureSymbols(source: string): FeatureSymbol[] {
  const symbols: FeatureSymbol[] = [];
  source.split("\n").forEach((line, index) => {
    const declaration = /^\s*(feature|data|screen|motion)\s+([A-Za-z][\w-]*).*?\sid\s+"([a-z][a-z0-9.-]+)"/.exec(line);
    const component = /^\s*(?:vertical\s+)?(?:stack|row|heading|text|button|image|video|text field|list|card|modal|spinner|badge|navigation bar)\s+([A-Za-z][\w-]*).*?\sid\s+"([a-z][a-z0-9.-]+)"/.exec(line);
    const behavior = /^\s*when\s+([A-Za-z][\w-]*)\s+is\s+([a-z-]+)/.exec(line);
    if (declaration) symbols.push({ name: declaration[2]!, kind: declaration[1] as FeatureSymbol["kind"], objectId: declaration[3]!, range: rangeForLine(source, index, line.indexOf(declaration[2]!) + 1, declaration[2]!.length) });
    else if (component) symbols.push({ name: component[1]!, kind: "component", objectId: component[2]!, range: rangeForLine(source, index, line.indexOf(component[1]!) + 1, component[1]!.length) });
    else if (behavior) symbols.push({ name: `${behavior[1]} ${behavior[2]}`, kind: "behavior", objectId: `${behavior[1]}.${behavior[2]}`, range: rangeForLine(source, index, line.indexOf(behavior[1]!) + 1, behavior[1]!.length) });
  });
  return symbols;
}

export class FeatureLanguageService {
  format(source: string) { return `${source.split("\n").map((line) => line.replaceAll("\t", "  ").replace(/\s+$/g, "")).join("\n").trim()}\n`; }
  symbols(source: string) { return featureSymbols(source); }
  complete(prefix: string) {
    const keywords = ["when", "if", "otherwise", "show", "hide", "ask", "set", "call", "navigate", "play", "wait", "requires", "data", "state", "screen", "motion"];
    return keywords.filter((item) => item.startsWith(prefix.toLowerCase()));
  }
  definition(source: string, name: string) { return featureSymbols(source).find((item) => item.name === name)?.range; }
}
