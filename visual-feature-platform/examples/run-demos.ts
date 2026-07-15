import { compileFeature, verifyFeaturePackage } from "@visual-feature/compiler";
import { createLiveInformationFeature, createPurchaseFeature } from "@visual-feature/model/examples";
import { createMockHost, FeatureRuntime, LiveEventRecorder, runFeatureTest } from "@visual-feature/runtime";

const purchase = createPurchaseFeature(); const purchasePackage = compileFeature(purchase); const verified = verifyFeaturePackage(purchasePackage.packageBytes);
const test = await runFeatureTest(purchasePackage.packageBytes, createMockHost(purchase), purchase.tests[0]!);
const runtime = new FeatureRuntime(purchasePackage.packageBytes, createMockHost(purchase)); await runtime.dispatch("BuyButton", "tapped"); await runtime.confirm(true);
const recorder = new LiveEventRecorder({ maxEvents: 20, redactFields: ["token"] }); recorder.record("LiveScoreFeed", { total: 42, token: "secret" }, 0); recorder.record("LiveScoreFeed", { total: 43, token: "secret" }, 100);
const live = createLiveInformationFeature(); const livePackage = compileFeature(live);

console.log(JSON.stringify({
  purchase: { id: verified.feature.id, packageBytes: purchasePackage.packageBytes.length, sourceHash: verified.sourceHash, testPassed: test.passed, finalState: runtime.snapshot().state.PurchaseStatus, traceEvents: runtime.snapshot().trace.length },
  live: { id: live.id, packageBytes: livePackage.packageBytes.length, connector: live.connectors[0]?.kind, replay: recorder.replay(2) },
}, null, 2));
