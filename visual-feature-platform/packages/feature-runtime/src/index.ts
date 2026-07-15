import { verifyFeaturePackage, type CompiledFeature } from "@visual-feature/compiler";
import { walkComponents, type BehaviorFlow, type BehaviorNode, type ConnectorDefinition, type ConnectorOperation, type FeatureIR, type FeatureTest, type JsonValue } from "@visual-feature/model";

export type ConnectorResult = { ok: true; value: JsonValue } | { ok: false; error: { code: string; message: string } };
export type ConnectorExecutor = (operation: ConnectorOperation, input: JsonValue, signal: AbortSignal) => Promise<ConnectorResult>;
export type RuntimeHost = {
  applicationId: string;
  platform: string;
  entitlements: ReadonlySet<string>;
  capabilities: ReadonlySet<string>;
  connectors: Readonly<Record<string, ConnectorExecutor>>;
};
export type RuntimeTrace = { sequence: number; timeMs: number; kind: "event" | "node" | "state" | "connector" | "animation" | "diagnostic"; label: string; objectId?: string; details?: JsonValue };
export type RuntimeSnapshot = { state: Record<string, JsonValue>; visible: Record<string, boolean>; activeAnimations: string[]; pendingConfirmation?: { nodeId: string; title: string; message: string; confirm: string; cancel: string }; trace: RuntimeTrace[] };

type Pending = { flow: BehaviorFlow; node: BehaviorNode };

const clone = <T>(value: T): T => structuredClone(value);
const targetName = (feature: FeatureIR, id: string) => walkComponents(feature).find((item) => item.id === id)?.name ?? id;

export class FeatureRuntime {
  readonly compiled: CompiledFeature;
  private readonly host: RuntimeHost;
  private readonly state: Record<string, JsonValue> = {};
  private readonly visible: Record<string, boolean> = {};
  private readonly activeAnimations = new Set<string>();
  private readonly trace: RuntimeTrace[] = [];
  private pending?: Pending;
  private sequence = 0;
  private clock = 0;
  private abortController?: AbortController;
  private readonly reducedMotion: boolean;

  constructor(packageBytes: Uint8Array, host: RuntimeHost, options: { reducedMotion?: boolean } = {}) {
    this.compiled = verifyFeaturePackage(packageBytes);
    this.host = host;
    this.reducedMotion = options.reducedMotion ?? false;
    if (!host.entitlements.has(this.compiled.feature.entitlement)) throw new Error(`Missing feature entitlement '${this.compiled.feature.entitlement}'.`);
    const missingCapabilities = this.compiled.feature.capabilities.filter((capability) => !host.capabilities.has(capability));
    if (missingCapabilities.length) throw new Error(`Host is missing required capabilities: ${missingCapabilities.join(", ")}.`);
    this.compiled.feature.state.forEach((item) => { this.state[item.name] = clone(item.initialValue ?? null); });
    walkComponents(this.compiled.feature).forEach((item) => { this.visible[item.id] = item.properties.visible !== false; });
    this.record("diagnostic", `Loaded ${this.compiled.feature.name}`, this.compiled.feature.id, { applicationId: host.applicationId, platform: host.platform });
  }

  private record(kind: RuntimeTrace["kind"], label: string, objectId?: string, details?: JsonValue) {
    this.clock += 1;
    this.trace.push({ sequence: ++this.sequence, timeMs: this.clock, kind, label, ...(objectId ? { objectId } : {}), ...(details !== undefined ? { details } : {}) });
    if (this.trace.length > 500) this.trace.splice(0, this.trace.length - 500);
  }

  snapshot(): RuntimeSnapshot {
    const pendingConfirmation = this.pending ? { nodeId: this.pending.node.id, title: String(this.pending.node.config.title ?? "Confirm"), message: this.interpolate(String(this.pending.node.config.message ?? "")), confirm: String(this.pending.node.config.confirm ?? "Confirm"), cancel: String(this.pending.node.config.cancel ?? "Cancel") } : undefined;
    return { state: clone(this.state), visible: { ...this.visible }, activeAnimations: [...this.activeAnimations], ...(pendingConfirmation ? { pendingConfirmation } : {}), trace: clone(this.trace) };
  }

  setData(name: string, value: JsonValue) {
    const field = this.compiled.feature.state.find((item) => item.name === name);
    if (!field) throw new Error(`State '${name}' is not declared.`);
    if (field.scope === "server") throw new Error(`Server-owned state '${name}' must arrive through a connector event.`);
    this.state[name] = clone(value); this.record("state", `Set ${name}`, field.id, value);
  }

  acceptServerValue(name: string, value: JsonValue) {
    const field = this.compiled.feature.state.find((item) => item.name === name);
    if (!field || field.scope !== "server") throw new Error(`'${name}' is not declared server-owned state.`);
    this.state[name] = clone(value); this.record("state", `Server updated ${name}`, field.id, value);
  }

  value(path: string): JsonValue | undefined {
    const segments = path.split("."); let current: unknown = this.state[segments.shift() ?? ""];
    for (const segment of segments) if (current && typeof current === "object" && !Array.isArray(current)) current = (current as Record<string, unknown>)[segment]; else return undefined;
    return current as JsonValue | undefined;
  }

  private interpolate(value: string) {
    return value.replace(/\{([A-Za-z][\w.]*)\}/g, (_, path: string) => String(this.value(path) ?? `{${path}}`));
  }

  async dispatch(componentNameOrId: string, event: string) {
    const component = walkComponents(this.compiled.feature).find((item) => item.id === componentNameOrId || item.name === componentNameOrId);
    if (!component) throw new Error(`Component '${componentNameOrId}' does not exist.`);
    const flow = this.compiled.feature.behaviors.find((item) => item.trigger.componentId === component.id && item.trigger.event === event);
    if (!flow) throw new Error(`No '${event}' behavior is attached to '${component.name}'.`);
    const eventNode = flow.nodes.find((item) => item.kind === "event"); if (!eventNode) throw new Error(`Behavior '${flow.name}' has no event node.`);
    this.record("event", `${component.name} ${event}`, component.id);
    const edge = flow.edges.find((item) => item.fromNodeId === eventNode.id && item.fromPortId === "next");
    if (edge) await this.runFrom(flow, edge.toNodeId);
    return this.snapshot();
  }

  async confirm(accepted: boolean) {
    if (!this.pending) throw new Error("No confirmation is pending.");
    const pending = this.pending; this.pending = undefined;
    this.visible[String(pending.node.config.modalId)] = false;
    this.record("event", accepted ? "Confirmation accepted" : "Confirmation cancelled", pending.node.id);
    const port = accepted ? "confirmed" : "cancelled";
    const edge = pending.flow.edges.find((item) => item.fromNodeId === pending.node.id && item.fromPortId === port);
    if (edge) await this.runFrom(pending.flow, edge.toNodeId);
    return this.snapshot();
  }

  cancelActiveOperation() { this.abortController?.abort(); this.abortController = undefined; }

  private async runFrom(flow: BehaviorFlow, firstNodeId: string) {
    let nodeId: string | undefined = firstNodeId;
    let steps = 0;
    while (nodeId) {
      if (++steps > 256) throw new Error("Behavior step limit exceeded.");
      const node = flow.nodes.find((item) => item.id === nodeId); if (!node) throw new Error(`Behavior node '${nodeId}' is missing.`);
      this.record("node", node.label, node.id);
      if (node.kind === "set-state") {
        const name = String(node.config.state); this.state[name] = node.config.value ?? null; this.record("state", `${name} = ${String(node.config.value)}`, node.id, node.config.value ?? null);
      } else if (node.kind === "show") {
        const id = String(node.config.componentId); this.visible[id] = true; this.record("node", `Show ${targetName(this.compiled.feature, id)}`, id);
      } else if (node.kind === "hide") {
        const id = String(node.config.componentId); this.visible[id] = false; this.record("node", `Hide ${targetName(this.compiled.feature, id)}`, id);
      } else if (node.kind === "ask") {
        this.visible[String(node.config.modalId)] = true; this.pending = { flow, node }; this.record("node", "Waiting for confirmation", node.id); return;
      } else if (node.kind === "animation") {
        const requested = String(node.config.motionId); const motion = this.compiled.feature.motions.find((item) => item.id === requested);
        const selected = this.reducedMotion && motion?.reducedMotionAlternative ? motion.reducedMotionAlternative : requested;
        this.activeAnimations.add(selected); this.record("animation", `Play ${selected}`, selected, { reducedMotion: this.reducedMotion });
      } else if (node.kind === "action") {
        const connectorId = String(node.config.connectorId); const operationId = String(node.config.operationId);
        const connector = this.compiled.feature.connectors.find((item) => item.id === connectorId); const operation = connector?.operations.find((item) => item.id === operationId); const execute = this.host.connectors[connectorId];
        if (!connector || !operation || !execute) throw new Error(`Connector action '${connectorId}.${operationId}' is unavailable.`);
        this.abortController?.abort(); this.abortController = new AbortController();
        this.record("connector", `Call ${connector.name}.${operation.name}`, node.id);
        const input = this.value(String(node.config.input)) ?? null;
        const result = await execute(operation, input, this.abortController.signal);
        this.record("connector", result.ok ? `${operation.name} succeeded` : `${operation.name} failed`, node.id, result.ok ? result.value : result.error);
        const edge = flow.edges.find((item) => item.fromNodeId === node.id && item.fromPortId === (result.ok ? "success" : "failure"));
        nodeId = edge?.toNodeId; continue;
      }
      const next = flow.edges.find((item) => item.fromNodeId === node.id && item.fromPortId === "next"); nodeId = next?.toNodeId;
    }
  }
}

export function createMockHost(feature: FeatureIR, purchaseOutcome: "success" | "failure" = "success"): RuntimeHost {
  const connectors: Record<string, ConnectorExecutor> = {};
  for (const connector of feature.connectors) connectors[connector.id] = async (operation, _input, signal) => {
    if (signal.aborted) return { ok: false, error: { code: "CANCELLED", message: "Operation was cancelled." } };
    if (connector.id === "connector.purchase" && purchaseOutcome === "failure") return { ok: false, error: { code: "PAYMENT_DECLINED", message: "The development purchase was declined." } };
    return { ok: true, value: operation.mockResult ?? { status: "ok" } };
  };
  return { applicationId: "new-jersey-courier", platform: "web", entitlements: new Set([feature.entitlement]), capabilities: new Set(feature.capabilities), connectors };
}

export function resolveBindings(feature: FeatureIR, state: Record<string, JsonValue>) {
  const resolved: Record<string, JsonValue> = {};
  const value = (path: string): JsonValue | undefined => {
    const segments = path.split("."); let current: unknown = state[segments.shift() ?? ""];
    for (const segment of segments) if (current && typeof current === "object" && !Array.isArray(current)) current = (current as Record<string, unknown>)[segment]; else return undefined;
    return current as JsonValue | undefined;
  };
  walkComponents(feature).flatMap((item) => item.bindings).forEach((binding) => { resolved[`${binding.targetComponentId}.${binding.targetProperty}`] = value(binding.expression) ?? null; });
  return resolved;
}

export type RecordedEvent = { sequence: number; timestampMs: number; source: string; payload: JsonValue };
export class LiveEventRecorder {
  private readonly events: RecordedEvent[] = [];
  private sequence = 0;
  constructor(private readonly options: { maxEvents?: number; redactFields?: string[] } = {}) {}
  record(source: string, payload: JsonValue, timestampMs: number) {
    const redact = (value: JsonValue): JsonValue => {
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.options.redactFields?.includes(key) ? "[REDACTED]" : redact(item)]));
      return value;
    };
    this.events.push({ sequence: ++this.sequence, timestampMs, source, payload: redact(payload) });
    const maximum = Math.min(10_000, this.options.maxEvents ?? 1_000); if (this.events.length > maximum) this.events.splice(0, this.events.length - maximum);
  }
  fixture() { return clone(this.events); }
  replay(speed = 1) { if (!Number.isFinite(speed) || speed <= 0 || speed > 100) throw new Error("Replay speed must be greater than zero and no more than 100x."); return this.events.map((event, index) => ({ ...clone(event), delayMs: index === 0 ? 0 : Math.max(0, (event.timestampMs - this.events[index - 1]!.timestampMs) / speed) })); }
}

export async function executeRestOperation(connector: ConnectorDefinition, operation: ConnectorOperation, input: JsonValue, hostCredentials: Readonly<Record<string, string>>, signal: AbortSignal): Promise<ConnectorResult> {
  if (!connector.baseUrl || (!connector.baseUrl.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/.test(connector.baseUrl))) return { ok: false, error: { code: "URL_POLICY", message: "REST connectors require HTTPS outside local development." } };
  const credential = connector.credentialReference ? hostCredentials[connector.credentialReference] : undefined;
  const response = await fetch(new URL(operation.path, connector.baseUrl), { method: operation.method, signal, headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) }, ...(operation.method === "GET" ? {} : { body: JSON.stringify(input) }) });
  const value = await response.json() as JsonValue; return response.ok ? { ok: true, value } : { ok: false, error: { code: `HTTP_${response.status}`, message: "The service returned an error." } };
}

export async function runFeatureTest(packageBytes: Uint8Array, host: RuntimeHost, test: FeatureTest) {
  const runtime = new FeatureRuntime(packageBytes, host); const failures: string[] = [];
  for (const step of test.steps) {
    if (step.action === "tap" && step.target) await runtime.dispatch(step.target, "tapped");
    if (step.action === "confirm") await runtime.confirm(step.value === true);
    if (step.action === "set-data" && step.target) runtime.setData(step.target, step.value ?? null);
    const snapshot = runtime.snapshot();
    if (step.action === "expect-state" && step.target && snapshot.state[step.target] !== step.value) failures.push(`Expected ${step.target} to be ${String(step.value)}.`);
    if (step.action === "expect-visible" && step.target) {
      const component = walkComponents(runtime.compiled.feature).find((item) => item.name === step.target || item.id === step.target);
      if (!component || !snapshot.visible[component.id]) failures.push(`Expected ${step.target} to be visible.`);
    }
    if (step.action === "expect-animation" && step.target) {
      const motion = runtime.compiled.feature.motions.find((item) => item.name === step.target || item.id === step.target);
      if (!motion || !snapshot.activeAnimations.includes(motion.id)) failures.push(`Expected ${step.target} to have played.`);
    }
  }
  return { passed: failures.length === 0, failures, trace: runtime.snapshot().trace };
}
