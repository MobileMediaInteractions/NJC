import assert from "node:assert/strict";
import test from "node:test";
import { compileFeature, sha256Hex, verifyFeaturePackage } from "@visual-feature/compiler";
import { FeatureLanguageService, formatFeatureSource, parseFeatureSource } from "@visual-feature/language";
import { behaviorSuggestions, validateFeature } from "@visual-feature/model";
import { createLiveInformationFeature, createPurchaseFeature } from "@visual-feature/model/examples";
import { createMockHost, FeatureRuntime, LiveEventRecorder, runFeatureTest } from "@visual-feature/runtime";

test("portable SHA-256 matches the published abc test vector", () => {
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("purchase feature has stable typed identities and no semantic errors", () => {
  const feature = createPurchaseFeature();
  assert.deepEqual(validateFeature(feature), []);
  assert.match(feature.id, /^[a-z][a-z0-9.-]+$/);
  assert.ok(feature.behaviors[0]?.nodes.every((node) => node.id.startsWith("behavior.")));
});

test("controlled English round trip updates both visual properties and graph configuration", () => {
  const feature = createPurchaseFeature(); const source = formatFeatureSource(feature);
  const edited = source.replace('button BuyButton saying "Purchase"', 'button BuyButton saying "Buy now"').replace('title "Confirm purchase"', 'title "Review order"');
  const parsed = parseFeatureSource(edited, feature);
  assert.equal(parsed.diagnostics.filter((item) => item.severity === "error").length, 0);
  const buy = parsed.feature.screens[0]?.root.children.find((item) => item.name === "BuyButton");
  const ask = parsed.feature.behaviors[0]?.nodes.find((item) => item.kind === "ask");
  assert.equal(buy?.properties.label, "Buy now");
  assert.equal(ask?.config.title, "Review order");
  assert.match(formatFeatureSource(parsed.feature), /saying "Buy now"/);
});

test("language service formats, completes, indexes symbols and resolves definitions", () => {
  const source = formatFeatureSource(createPurchaseFeature()); const service = new FeatureLanguageService();
  assert.ok(service.complete("na").includes("navigate"));
  assert.ok(service.symbols(source).some((symbol) => symbol.name === "BuyButton"));
  assert.ok(service.definition(source, "BuyButton"));
  assert.equal(service.format(`${source.trimEnd()}   \n`), source);
});

test("compiler is deterministic and package verifier rejects tampering", () => {
  const first = compileFeature(createPurchaseFeature()); const second = compileFeature(createPurchaseFeature());
  assert.deepEqual(first.packageBytes, second.packageBytes);
  assert.equal(verifyFeaturePackage(first.packageBytes).feature.id, "studio.purchase-confirmation");
  const tampered = first.packageBytes.slice(); const index = tampered.length - 2; tampered[index] = tampered[index]! ^ 0xff;
  assert.throws(() => verifyFeaturePackage(tampered), /checksum/);
});

test("typed behavior graph rejects incompatible connections", () => {
  const feature = createPurchaseFeature(); const flow = feature.behaviors[0]!;
  flow.nodes[0]!.outputs[0]!.valueType = "image";
  assert.ok(validateFeature(feature).some((item) => item.code === "FEATURE_EDGE_TYPE"));
});

test("binding cycles and unsafe connector URLs are diagnosed", () => {
  const feature = createLiveInformationFeature();
  feature.connectors[0]!.baseUrl = "http://public.example.test";
  const score = feature.screens[0]!.root.children.find((item) => item.name === "ScoreText")!;
  score.bindings.push({ id: "binding.cycle.one", targetComponentId: score.id, targetProperty: "a", expression: `${score.id}.b`, mode: "derived", valueType: "number" });
  score.bindings.push({ id: "binding.cycle.two", targetComponentId: score.id, targetProperty: "b", expression: `${score.id}.a`, mode: "derived", valueType: "number" });
  const codes = validateFeature(feature).map((item) => item.code);
  assert.ok(codes.includes("FEATURE_URL_POLICY")); assert.ok(codes.includes("FEATURE_BINDING_CYCLE"));
});

test("runtime enforces entitlement and executes success and failure paths", async () => {
  const feature = createPurchaseFeature(); const compiled = compileFeature(feature);
  assert.throws(() => new FeatureRuntime(compiled.packageBytes, { ...createMockHost(feature), entitlements: new Set() }), /Missing feature entitlement/);
  const success = new FeatureRuntime(compiled.packageBytes, createMockHost(feature)); await success.dispatch("BuyButton", "tapped");
  assert.equal(success.snapshot().state.PurchaseStatus, "confirming"); assert.ok(success.snapshot().pendingConfirmation);
  await success.confirm(true); assert.equal(success.snapshot().state.PurchaseStatus, "success"); assert.ok(success.snapshot().activeAnimations.includes("motion.purchase-success"));
  const failure = new FeatureRuntime(compiled.packageBytes, createMockHost(feature, "failure")); await failure.dispatch("BuyButton", "tapped"); await failure.confirm(true);
  assert.equal(failure.snapshot().state.PurchaseStatus, "failure"); assert.equal(failure.snapshot().visible["component.purchase-error"], true);
});

test("reduced motion selects the declared alternative", async () => {
  const feature = createPurchaseFeature(); const compiled = compileFeature(feature); const runtime = new FeatureRuntime(compiled.packageBytes, createMockHost(feature), { reducedMotion: true });
  await runtime.dispatch("BuyButton", "tapped"); await runtime.confirm(true);
  assert.ok(runtime.snapshot().activeAnimations.includes("motion.purchase-success-reduced"));
});

test("recorded interaction test runs against the compiled package", async () => {
  const feature = createPurchaseFeature(); const compiled = compileFeature(feature); const result = await runFeatureTest(compiled.packageBytes, createMockHost(feature), feature.tests[0]!);
  assert.equal(result.passed, true); assert.equal(result.failures.length, 0); assert.ok(result.trace.some((item) => item.kind === "connector"));
});

test("bounded live recorder redacts configured fields and scales replay time", () => {
  const recorder = new LiveEventRecorder({ maxEvents: 2, redactFields: ["token"] });
  recorder.record("score", { value: 1, token: "one" }, 0); recorder.record("score", { value: 2, token: "two" }, 100); recorder.record("score", { value: 3, token: "three" }, 300);
  assert.equal(recorder.fixture().length, 2); assert.equal((recorder.fixture()[0]?.payload as Record<string, unknown>).token, "[REDACTED]"); assert.equal(recorder.replay(2)[1]?.delayMs, 100);
});

test("component-specific suggestions come from schemas", () => {
  assert.ok(behaviorSuggestions("button").includes("start purchase")); assert.ok(behaviorSuggestions("video").includes("seek")); assert.ok(behaviorSuggestions("text-field").includes("search while typing"));
});

test("large but bounded feature compiles within a smoke-test budget", () => {
  const feature = createPurchaseFeature(); const root = feature.screens[0]!.root;
  for (let index = 0; index < 250; index += 1) root.children.push({ id: `component.smoke.${index}`, name: `Smoke${index}`, type: "text", properties: { text: `Item ${index}`, opacity: 1 }, layout: { kind: "stack", width: "fill", height: "content" }, accessibility: {}, bindings: [], children: [] });
  const start = performance.now(); const compiled = compileFeature(feature); const elapsed = performance.now() - start;
  assert.ok(compiled.packageBytes.length < 2 * 1024 * 1024); assert.ok(elapsed < 1_500, `compile took ${elapsed}ms`);
});
