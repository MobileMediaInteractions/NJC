export type StableId = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type ValueType = "control" | "text" | "number" | "boolean" | "money" | "image" | "video" | "record" | "list" | "error" | "result" | "event" | "any";
export type PlatformId = "web" | "ios" | "android" | "tvos" | "androidtv" | "roku" | "desktop";
export type StateScope = "local" | "screen" | "feature" | "session" | "application" | "persisted" | "secure" | "server";

export type SourceRange = {
  start: { offset: number; line: number; column: number };
  end: { offset: number; line: number; column: number };
};

export type FeatureDiagnostic = {
  severity: "error" | "warning";
  code: string;
  message: string;
  objectId?: StableId;
  path?: string;
  range?: SourceRange;
};

export type DataField = {
  id: StableId;
  name: string;
  type: "text" | "number" | "boolean" | "money" | "image" | "video" | "date" | "record" | "list";
  optional?: boolean;
  itemType?: string;
  defaultValue?: JsonValue;
  validation?: { required?: boolean; minimum?: number; maximum?: number; pattern?: string };
};

export type DataModel = { id: StableId; name: string; fields: DataField[] };
export type StateField = { id: StableId; name: string; type: string; scope: StateScope; initialValue?: JsonValue; sensitive?: boolean };

export type Binding = {
  id: StableId;
  targetComponentId: StableId;
  targetProperty: string;
  expression: string;
  mode: "one-way" | "two-way" | "derived";
  valueType: ValueType;
  changeAnimation?: "immediate" | "crossfade" | "count" | "tween" | "spring" | "slide" | "flip" | "reveal" | "type" | "pulse" | "highlight" | "custom";
};

export type FeatureComponent = {
  id: StableId;
  name: string;
  type: string;
  properties: Record<string, JsonValue>;
  layout: {
    kind: "stack" | "row" | "grid" | "overlay" | "absolute";
    gap?: number;
    padding?: number;
    width?: number | "fill" | "content";
    height?: number | "fill" | "content";
    align?: "start" | "center" | "end" | "stretch";
  };
  accessibility: { name?: string; role?: string; hint?: string; focusOrder?: number; decorative?: boolean };
  bindings: Binding[];
  children: FeatureComponent[];
  locked?: boolean;
  hidden?: boolean;
  platformOverrides?: Partial<Record<PlatformId, Record<string, JsonValue>>>;
};

export type FeatureScreen = {
  id: StableId;
  name: string;
  route: string;
  requiresAuthentication?: boolean;
  requiredEntitlement?: string;
  root: FeatureComponent;
};

export type GraphPort = { id: string; label: string; valueType: ValueType; required?: boolean };
export type BehaviorNodeKind = "event" | "ask" | "set-state" | "action" | "condition" | "show" | "hide" | "navigate" | "animation" | "wait" | "emit" | "error" | "parallel";

export type BehaviorNode = {
  id: StableId;
  kind: BehaviorNodeKind;
  label: string;
  inputs: GraphPort[];
  outputs: GraphPort[];
  config: Record<string, JsonValue>;
  position: { x: number; y: number };
};

export type BehaviorEdge = {
  id: StableId;
  fromNodeId: StableId;
  fromPortId: string;
  toNodeId: StableId;
  toPortId: string;
  valueType: ValueType;
  outcome?: "next" | "confirmed" | "cancelled" | "success" | "failure" | "true" | "false";
};

export type BehaviorFlow = {
  id: StableId;
  name: string;
  trigger: { componentId: StableId; event: string };
  nodes: BehaviorNode[];
  edges: BehaviorEdge[];
};

export type MotionKeyframe = {
  id: StableId;
  timeMs: number;
  value: number;
  interpolation: "linear" | "hold" | "step" | "bezier" | "spring";
  incomingVelocity?: number;
  outgoingVelocity?: number;
  cubicBezier?: [number, number, number, number];
  label?: string;
};

export type MotionTrack = { id: StableId; targetComponentId: StableId; property: string; keyframes: MotionKeyframe[] };
export type MotionComposition = {
  id: StableId;
  name: string;
  durationMs: number;
  tracks: MotionTrack[];
  reducedMotionAlternative?: StableId;
  markers: { id: StableId; name: string; timeMs: number }[];
};

export type ConnectorOperation = {
  id: StableId;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "SUBSCRIBE";
  path: string;
  inputType?: string;
  outputType: string;
  timeoutMs: number;
  retry: { attempts: number; baseDelayMs: number; exponential: boolean };
  mockResult?: JsonValue;
};

export type ConnectorDefinition = {
  id: StableId;
  name: string;
  kind: "rest" | "graphql" | "websocket" | "sse" | "local-storage" | "secure-storage" | "host" | "media";
  baseUrl?: string;
  credentialReference?: string;
  capabilities: string[];
  entitlement?: string;
  operations: ConnectorOperation[];
  realtime?: { reconnect: boolean; maxBackoffMs: number; staleAfterMs: number; maxEventsPerSecond: number; keepLastValue: boolean };
};

export type FeatureTestStep = {
  id: StableId;
  action: "open" | "tap" | "confirm" | "set-data" | "emit" | "expect-state" | "expect-visible" | "expect-animation";
  target?: string;
  value?: JsonValue;
};
export type FeatureTest = { id: StableId; name: string; steps: FeatureTestStep[] };

export type FeatureIR = {
  schemaVersion: 1;
  id: StableId;
  name: string;
  version: string;
  minimumRuntime: string;
  supportedPlatforms: PlatformId[];
  entitlement: string;
  capabilities: string[];
  designTokens: Record<string, JsonValue>;
  dataModels: DataModel[];
  state: StateField[];
  screens: FeatureScreen[];
  behaviors: BehaviorFlow[];
  connectors: ConnectorDefinition[];
  motions: MotionComposition[];
  localizations: Record<string, Record<string, string>>;
  tests: FeatureTest[];
  migrations: { id: StableId; from: string; to: string }[];
};

export type ComponentDefinition = {
  type: string;
  label: string;
  category: "layout" | "content" | "input" | "collection" | "feedback" | "media" | "navigation";
  events: string[];
  actions: string[];
  properties: { name: string; valueType: ValueType; bindable: boolean; animatable: boolean; defaultValue: JsonValue }[];
  requiredCapabilities: string[];
  platforms: PlatformId[];
  interactive: boolean;
};

const commonPlatforms: PlatformId[] = ["web", "ios", "android", "tvos", "androidtv", "desktop"];
const definition = (value: Omit<ComponentDefinition, "platforms"> & { platforms?: PlatformId[] }): ComponentDefinition => ({ ...value, platforms: value.platforms ?? commonPlatforms });
const appearance = [
  { name: "opacity", valueType: "number", bindable: true, animatable: true, defaultValue: 1 },
  { name: "visible", valueType: "boolean", bindable: true, animatable: false, defaultValue: true },
] satisfies ComponentDefinition["properties"];

export const componentRegistry: ComponentDefinition[] = [
  definition({ type: "stack", label: "Vertical stack", category: "layout", events: ["appears"], actions: ["show", "hide"], properties: [{ name: "gap", valueType: "number", bindable: false, animatable: true, defaultValue: 16 }, ...appearance], requiredCapabilities: [], interactive: false }),
  definition({ type: "row", label: "Horizontal row", category: "layout", events: ["appears"], actions: ["show", "hide"], properties: [{ name: "gap", valueType: "number", bindable: false, animatable: true, defaultValue: 12 }, ...appearance], requiredCapabilities: [], interactive: false }),
  definition({ type: "heading", label: "Heading", category: "content", events: ["visible", "hidden"], actions: ["show", "hide", "set value", "animate property"], properties: [{ name: "text", valueType: "text", bindable: true, animatable: true, defaultValue: "Heading" }, ...appearance], requiredCapabilities: ["accessibility"], interactive: false }),
  definition({ type: "text", label: "Text", category: "content", events: ["visible", "hidden", "value changes"], actions: ["show", "hide", "set value", "animate property"], properties: [{ name: "text", valueType: "text", bindable: true, animatable: true, defaultValue: "Text" }, ...appearance], requiredCapabilities: ["localization"], interactive: false }),
  definition({ type: "button", label: "Button", category: "input", events: ["tapped", "pressed", "released", "focused", "unfocused", "enabled", "disabled"], actions: ["navigate", "show modal", "run action", "change state", "submit form", "play animation", "start purchase"], properties: [{ name: "label", valueType: "text", bindable: true, animatable: true, defaultValue: "Button" }, ...appearance], requiredCapabilities: ["accessibility"], interactive: true }),
  definition({ type: "image", label: "Image", category: "media", events: ["loaded", "failed", "visible"], actions: ["change source", "show", "hide", "animate property"], properties: [{ name: "source", valueType: "image", bindable: true, animatable: false, defaultValue: "asset://placeholder" }, ...appearance], requiredCapabilities: ["media"], interactive: false }),
  definition({ type: "video", label: "Video", category: "media", events: ["connected", "buffering", "finished", "failed"], actions: ["play", "pause", "seek", "mute", "change source", "enter fullscreen"], properties: [{ name: "source", valueType: "video", bindable: true, animatable: false, defaultValue: "" }, ...appearance], requiredCapabilities: ["media"], interactive: true }),
  definition({ type: "text-field", label: "Text field", category: "input", events: ["changes", "focused", "submitted"], actions: ["validate", "save value", "search while typing", "format input", "clear"], properties: [{ name: "placeholder", valueType: "text", bindable: true, animatable: false, defaultValue: "" }, ...appearance], requiredCapabilities: ["accessibility"], interactive: true }),
  definition({ type: "list", label: "Lazy list", category: "collection", events: ["item selected", "reaches end"], actions: ["filter", "refresh", "scroll", "select item"], properties: [{ name: "items", valueType: "list", bindable: true, animatable: false, defaultValue: [] }, ...appearance], requiredCapabilities: [], interactive: true }),
  definition({ type: "card", label: "Card", category: "content", events: ["tapped", "visible"], actions: ["show", "hide", "navigate"], properties: [{ name: "title", valueType: "text", bindable: true, animatable: true, defaultValue: "Card" }, ...appearance], requiredCapabilities: [], interactive: true }),
  definition({ type: "modal", label: "Modal", category: "feedback", events: ["opened", "closed", "confirmed", "cancelled"], actions: ["open", "close", "confirm"], properties: [{ name: "title", valueType: "text", bindable: true, animatable: true, defaultValue: "Confirm" }, { name: "message", valueType: "text", bindable: true, animatable: true, defaultValue: "Are you sure?" }, ...appearance], requiredCapabilities: ["ui-overlays", "accessibility"], interactive: true }),
  definition({ type: "spinner", label: "Progress spinner", category: "feedback", events: ["visible", "hidden"], actions: ["show", "hide", "play animation"], properties: appearance, requiredCapabilities: ["animation"], interactive: false }),
  definition({ type: "badge", label: "Badge", category: "feedback", events: ["value changes"], actions: ["set value", "show", "hide"], properties: [{ name: "value", valueType: "text", bindable: true, animatable: true, defaultValue: "New" }, ...appearance], requiredCapabilities: [], interactive: false }),
  definition({ type: "navigation-bar", label: "Navigation bar", category: "navigation", events: ["item selected"], actions: ["navigate", "go back"], properties: appearance, requiredCapabilities: ["navigation"], interactive: true }),
];

export function componentDefinition(type: string) { return componentRegistry.find((item) => item.type === type); }
export function behaviorSuggestions(componentType: string) { return componentDefinition(componentType)?.actions ?? []; }

export function walkComponents(feature: FeatureIR) {
  const result: FeatureComponent[] = [];
  const visit = (component: FeatureComponent) => { result.push(component); component.children.forEach(visit); };
  feature.screens.forEach((screen) => visit(screen.root));
  return result;
}

function diagnostic(code: string, message: string, objectId?: string): FeatureDiagnostic {
  return { severity: "error", code, message, ...(objectId ? { objectId } : {}) };
}

export function validateFeature(feature: FeatureIR): FeatureDiagnostic[] {
  const diagnostics: FeatureDiagnostic[] = [];
  if (feature.schemaVersion !== 1) diagnostics.push(diagnostic("FEATURE_SCHEMA", "Only Feature IR schema version 1 is supported."));
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(feature.id)) diagnostics.push(diagnostic("FEATURE_ID", "Feature identity must be a lowercase dotted identifier.", feature.id));
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(feature.version)) diagnostics.push(diagnostic("FEATURE_VERSION", "Feature version must use semantic versioning.", feature.id));
  if (!feature.entitlement) diagnostics.push(diagnostic("FEATURE_ENTITLEMENT", "A releasable feature requires an entitlement.", feature.id));
  const components = walkComponents(feature);
  const allIds = [feature.id, ...components.map((item) => item.id), ...feature.behaviors.flatMap((flow) => [flow.id, ...flow.nodes.map((item) => item.id), ...flow.edges.map((item) => item.id)]), ...feature.motions.flatMap((motion) => [motion.id, ...motion.tracks.flatMap((track) => [track.id, ...track.keyframes.map((item) => item.id)])])];
  const duplicates = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  [...new Set(duplicates)].forEach((id) => diagnostics.push(diagnostic("FEATURE_DUPLICATE_ID", `Stable identity '${id}' is duplicated.`, id)));
  if (components.length > 500) diagnostics.push(diagnostic("FEATURE_COMPONENT_LIMIT", "A feature may contain at most 500 components."));
  if (feature.behaviors.reduce((sum, item) => sum + item.nodes.length, 0) > 1_000) diagnostics.push(diagnostic("FEATURE_BEHAVIOR_LIMIT", "A feature may contain at most 1,000 behavior nodes."));
  const componentIds = new Set(components.map((item) => item.id));
  for (const component of components) {
    const definition = componentDefinition(component.type);
    if (!definition) diagnostics.push(diagnostic("FEATURE_COMPONENT_UNKNOWN", `Component type '${component.type}' is not registered.`, component.id));
    if (definition?.interactive && !component.accessibility.name) diagnostics.push(diagnostic("FEATURE_ACCESSIBLE_NAME", `Interactive component '${component.name}' requires an accessible name.`, component.id));
  }
  for (const flow of feature.behaviors) {
    if (!componentIds.has(flow.trigger.componentId)) diagnostics.push(diagnostic("FEATURE_TRIGGER_TARGET", `Behavior '${flow.name}' targets a missing component.`, flow.id));
    const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
    for (const edge of flow.edges) {
      const from = nodes.get(edge.fromNodeId); const to = nodes.get(edge.toNodeId);
      if (!from || !to) { diagnostics.push(diagnostic("FEATURE_EDGE_TARGET", `Behavior edge '${edge.id}' references a missing node.`, edge.id)); continue; }
      const output = from.outputs.find((port) => port.id === edge.fromPortId); const input = to.inputs.find((port) => port.id === edge.toPortId);
      if (!output || !input) diagnostics.push(diagnostic("FEATURE_EDGE_PORT", `Behavior edge '${edge.id}' references a missing port.`, edge.id));
      else if (output.valueType !== input.valueType && output.valueType !== "any" && input.valueType !== "any") diagnostics.push(diagnostic("FEATURE_EDGE_TYPE", `Cannot connect ${output.valueType} to ${input.valueType} without a transform.`, edge.id));
    }
  }
  const bindingTargets = new Map<string, string>();
  components.flatMap((item) => item.bindings).forEach((binding) => bindingTargets.set(`${binding.targetComponentId}.${binding.targetProperty}`, binding.expression));
  for (const [target, expression] of bindingTargets) if (bindingTargets.get(expression) === target) diagnostics.push(diagnostic("FEATURE_BINDING_CYCLE", `Binding cycle detected between '${target}' and '${expression}'.`));
  for (const connector of feature.connectors) {
    if (connector.baseUrl && !/^https:\/\//.test(connector.baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/.test(connector.baseUrl)) diagnostics.push(diagnostic("FEATURE_URL_POLICY", `Connector '${connector.name}' must use HTTPS or a local development URL.`, connector.id));
    if (connector.credentialReference && !/^host:[a-z][a-z0-9.-]+$/.test(connector.credentialReference)) diagnostics.push(diagnostic("FEATURE_CREDENTIAL_REFERENCE", `Connector '${connector.name}' must reference a host credential instead of embedding a secret.`, connector.id));
  }
  for (const motion of feature.motions) for (const track of motion.tracks) if (!componentIds.has(track.targetComponentId)) diagnostics.push(diagnostic("FEATURE_MOTION_TARGET", `Motion track '${track.id}' targets a missing component.`, track.id));
  return diagnostics;
}
