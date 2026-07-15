import { compileFeature } from "@visual-feature/compiler";
import { createPurchaseFeature } from "@visual-feature/model/examples";
import { createMockHost, FeatureRuntime, LiveEventRecorder } from "@visual-feature/runtime";

const feature = createPurchaseFeature(); const root = feature.screens[0]!.root;
for (let index = 0; index < 250; index += 1) root.children.push({ id: `component.benchmark.${index}`, name: `Benchmark${index}`, type: "text", properties: { text: `Item ${index}`, opacity: 1 }, layout: { kind: "stack", width: "fill", height: "content" }, accessibility: {}, bindings: [], children: [] });
const heapBefore = process.memoryUsage().heapUsed;
const compileStart = performance.now(); const compiled = compileFeature(feature); const compileMs = performance.now() - compileStart;
const loadStart = performance.now(); const runtime = new FeatureRuntime(compiled.packageBytes, createMockHost(feature)); const loadMs = performance.now() - loadStart;
const behaviorStart = performance.now(); await runtime.dispatch("BuyButton", "tapped"); await runtime.confirm(true); const behaviorMs = performance.now() - behaviorStart;
const recorder = new LiveEventRecorder({ maxEvents: 1_000 }); const recordStart = performance.now(); for (let index = 0; index < 1_000; index += 1) recorder.record("benchmark", { value: index }, index * 16); const recordMs = performance.now() - recordStart;
console.log(JSON.stringify({ components: root.children.length + 1, behaviorNodes: feature.behaviors[0]?.nodes.length, keyframes: feature.motions.flatMap((motion) => motion.tracks).flatMap((track) => track.keyframes).length, packageBytes: compiled.packageBytes.length, compileMs, runtimeLoadMs: loadMs, behaviorMs, record1000EventsMs: recordMs, heapDeltaBytes: process.memoryUsage().heapUsed - heapBefore }, null, 2));
