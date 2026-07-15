import { useRef, useState } from "react";
import { FeatureLanguageService, formatFeatureSource, parseFeatureSource } from "@visual-feature/language";
import { componentDefinition, type BehaviorNode, type ComponentDefinition, type FeatureIR, type MotionKeyframe } from "@visual-feature/model";
import { createPurchaseFeature } from "@visual-feature/model/examples";
import { createMockHost, runFeatureTest } from "@visual-feature/runtime";
import { ComposerBehavior } from "./ComposerBehavior";
import { ComposerCode } from "./ComposerCode";
import { ComposerData } from "./ComposerData";
import { ComposerDesign } from "./ComposerDesign";
import { ComposerMotion } from "./ComposerMotion";
import { ComposerTest } from "./ComposerTest";
import type { ComposerMode, ComposerSession, SimulationOutcome } from "./types";
import { createSessionRuntime, findComponent, mutateComponent } from "./utilities";
import "./composer.css";

const language = new FeatureLanguageService();
const modes: { id: ComposerMode; label: string; icon: string }[] = [
  { id: "design", label: "Design", icon: "▱" }, { id: "behavior", label: "Behavior", icon: "⌁" }, { id: "data", label: "Data", icon: "◫" },
  { id: "motion", label: "Motion", icon: "◇" }, { id: "test", label: "Test", icon: "▷" }, { id: "code", label: "Code", icon: "⌘" },
];

function buildSession(feature: FeatureIR, outcome: SimulationOutcome, reducedMotion: boolean): ComposerSession {
  const built = createSessionRuntime(feature, outcome, reducedMotion);
  return { feature, ...built, diagnostics: built.compilation.diagnostics, outcome, reducedMotion };
}

export function FeatureComposer() {
  const [mode, setMode] = useState<ComposerMode>("design");
  const [session, setSession] = useState<ComposerSession>(() => buildSession(createPurchaseFeature(), "success", false));
  const [selectedId, setSelectedId] = useState("component.buy-button");
  const [selectedMotionId, setSelectedMotionId] = useState("motion.purchase-success");
  const [sourceDraft, setSourceDraft] = useState(() => formatFeatureSource(createPurchaseFeature()));
  const [testResult, setTestResult] = useState<{ passed: boolean; failures: string[] }>();
  const idCounter = useRef(0);

  const commit = (feature: FeatureIR, options: { preserveSourceDraft?: boolean; diagnostics?: ComposerSession["diagnostics"] } = {}) => {
    const next = buildSession(feature, session.outcome, session.reducedMotion);
    setSession({ ...next, diagnostics: options.diagnostics ?? next.diagnostics });
    if (!options.preserveSourceDraft) setSourceDraft(formatFeatureSource(feature));
    setTestResult(undefined);
  };

  const updateProperty = (name: string, value: string | number | boolean) => {
    const next = mutateComponent(session.feature, selectedId, (component) => {
      if (name === "$accessibleName") component.accessibility.name = String(value); else component.properties[name] = value;
    });
    commit(next);
  };

  const addComponent = (definition: ComponentDefinition) => {
    const next = structuredClone(session.feature); const count = ++idCounter.current;
    const name = `${definition.label.replace(/[^A-Za-z0-9]/g, "")} ${count}`.replaceAll(" ", "");
    const id = `component.${definition.type}.${count}`;
    const root = next.screens[0]?.root; if (!root) return;
    root.children.push({ id, name, type: definition.type, properties: Object.fromEntries(definition.properties.map((property) => [property.name, property.defaultValue])), layout: { kind: "stack", width: "fill", height: "content" }, accessibility: definition.interactive ? { name: definition.label } : {}, bindings: [], children: [] });
    setSelectedId(id); commit(next);
  };

  const addGuidedAction = (action: string) => {
    const next = structuredClone(session.feature); const component = findComponent(next, selectedId); if (!component) return;
    let flow = next.behaviors.find((item) => item.trigger.componentId === component.id);
    if (!flow) {
      const event: BehaviorNode = { id: `behavior.${component.name}.event`, kind: "event", label: `${component.name} tapped`, inputs: [], outputs: [{ id: "next", label: "Next", valueType: "control" }], config: { componentId: component.id, event: "tapped" }, position: { x: 20, y: 40 } };
      flow = { id: `behavior.${component.name}`, name: `${component.name}Behavior`, trigger: { componentId: component.id, event: componentDefinition(component.type)?.events[0] ?? "tapped" }, nodes: [event], edges: [] }; next.behaviors.push(flow);
    }
    const kind: BehaviorNode["kind"] = action.includes("navigate") ? "navigate" : action.includes("animation") ? "animation" : action.includes("modal") ? "show" : action.includes("state") ? "set-state" : "emit";
    const created: BehaviorNode = { id: `${flow.id}.guided.${flow.nodes.length}`, kind, label: action, inputs: [{ id: "in", label: "In", valueType: "control" }], outputs: [{ id: "next", label: "Next", valueType: "control" }], config: kind === "animation" ? { motionId: next.motions[0]?.id ?? "" } : kind === "show" ? { componentId: next.screens[0]?.root.children.find((item) => item.type === "modal")?.id ?? "" } : kind === "navigate" ? { screen: next.screens[0]?.name ?? "" } : kind === "set-state" ? { state: next.state[0]?.name ?? "", value: "updated" } : { event: action }, position: { x: 20, y: flow.nodes.length * 100 + 60 } };
    const terminal = [...flow.nodes].reverse().find((node) => !flow!.edges.some((edge) => edge.fromNodeId === node.id)); flow.nodes.push(created);
    if (terminal) flow.edges.push({ id: `${flow.id}.edge.${flow.edges.length}`, fromNodeId: terminal.id, fromPortId: terminal.outputs[0]?.id ?? "next", toNodeId: created.id, toPortId: "in", valueType: "control" });
    commit(next);
  };

  const updateMockName = (value: string) => {
    const next = structuredClone(session.feature); const field = next.state.find((item) => item.name === "SelectedProduct");
    if (field?.initialValue && typeof field.initialValue === "object" && !Array.isArray(field.initialValue)) field.initialValue.name = value;
    const title = findComponent(next, "component.buy-button"); if (title) title.accessibility.name = `Purchase ${value}`;
    commit(next);
  };

  const updateKeyframe = (trackId: string, keyframeId: string, patch: Partial<MotionKeyframe>) => {
    const next = structuredClone(session.feature); const keyframe = next.motions.flatMap((motion) => motion.tracks).find((track) => track.id === trackId)?.keyframes.find((item) => item.id === keyframeId); if (!keyframe) return;
    Object.assign(keyframe, patch); commit(next);
  };

  const replaceRuntime = (outcome: SimulationOutcome, reducedMotion: boolean) => setSession(buildSession(session.feature, outcome, reducedMotion));
  const updateSnapshot = (runtime: ComposerSession["runtime"], snapshot: ComposerSession["snapshot"]) => setSession((current) => current.runtime === runtime ? { ...current, snapshot } : current);
  const startPurchase = async () => { const runtime = session.runtime; try { updateSnapshot(runtime, await runtime.dispatch("BuyButton", "tapped")); } catch { /* Selected feature may not have the demo flow. */ } };
  const confirmPurchase = async (accepted: boolean) => { const runtime = session.runtime; if (!runtime.snapshot().pendingConfirmation) return; updateSnapshot(runtime, await runtime.confirm(accepted)); };
  const runTest = async () => { const test = session.feature.tests[0]; if (!test) return; const result = await runFeatureTest(session.compilation.packageBytes, createMockHost(session.feature, session.outcome), test); setTestResult({ passed: result.passed, failures: result.failures }); };
  const applySource = () => {
    const parsed = parseFeatureSource(sourceDraft, session.feature); const hasErrors = parsed.diagnostics.some((item) => item.severity === "error");
    if (hasErrors) setSession((current) => ({ ...current, diagnostics: parsed.diagnostics })); else commit(parsed.feature, { preserveSourceDraft: true, diagnostics: parsed.diagnostics });
  };
  const selected = findComponent(session.feature, selectedId); const flow = session.feature.behaviors.find((item) => item.trigger.componentId === selectedId);

  return <section className="feature-composer" aria-label="Visual Feature Composer">
    <header className="composer-modebar"><div><span className="composer-mark">FC</span><strong>{session.feature.name}</strong><small>Canonical Feature IR · {session.feature.version}</small></div><nav aria-label="Composer modes">{modes.map((item) => <button type="button" key={item.id} aria-label={item.label} className={mode === item.id ? "active" : ""} aria-current={mode === item.id ? "page" : undefined} onClick={() => setMode(item.id)}><i aria-hidden="true">{item.icon}</i>{item.label}</button>)}</nav><aside><span className={session.diagnostics.some((item) => item.severity === "error") ? "invalid" : "valid"}>{session.diagnostics.some((item) => item.severity === "error") ? "! Needs attention" : "✓ Compiled"}</span><b>{(session.compilation.packageBytes.length / 1024).toFixed(1)} KiB</b></aside></header>
    <div className="composer-body">
      {mode === "design" && <ComposerDesign feature={session.feature} snapshot={session.snapshot} selectedId={selectedId} onSelect={setSelectedId} onAdd={addComponent} onProperty={updateProperty} onTrigger={() => void startPurchase()} onConfirm={(accepted) => void confirmPurchase(accepted)} />}
      {mode === "behavior" && <ComposerBehavior selected={selected} flow={flow} source={formatFeatureSource(session.feature).split("\n").slice(-45).join("\n")} onAddAction={addGuidedAction} />}
      {mode === "data" && <ComposerData feature={session.feature} onMockName={updateMockName} />}
      {mode === "motion" && <ComposerMotion feature={session.feature} selectedMotionId={selectedMotionId} onSelectMotion={setSelectedMotionId} onKeyframe={updateKeyframe} />}
      {mode === "test" && <ComposerTest feature={session.feature} snapshot={session.snapshot} outcome={session.outcome} reducedMotion={session.reducedMotion} packageBytes={session.compilation.packageBytes.length} testResult={testResult} onOutcome={(value) => replaceRuntime(value, session.reducedMotion)} onReducedMotion={(value) => replaceRuntime(session.outcome, value)} onStart={() => void startPurchase()} onConfirm={(accepted) => void confirmPurchase(accepted)} onRunTest={() => void runTest()} onReset={() => replaceRuntime(session.outcome, session.reducedMotion)} />}
      {mode === "code" && <ComposerCode source={sourceDraft} diagnostics={session.diagnostics} onSource={setSourceDraft} onApply={applySource} onFormat={() => setSourceDraft(language.format(sourceDraft))} />}
    </div>
  </section>;
}
