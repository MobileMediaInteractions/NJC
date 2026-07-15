import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AnimationRuntime, compileAnimation } from "../src/animation/index";
import { AnimationFeature, DiagnosticsFeature, FeatureHost, StatusCardFeature, animationFeatureManifest, diagnosticsFeatureManifest, uiFeatureManifest } from "../src/index";
import { createDevelopmentLicenseFixture, firstPartyWebIdentity, thirdPartyIdentity } from "./development-license-fixture";

process.env.PLATFORM_DEV_LICENSE_MODE = "true";
const source = await readFile(fileURLToPath(new URL("./animation-showcase/welcome.pani", import.meta.url)), "utf8");
const compiled = compileAnimation(source);
const { service, firstParty, thirdParty } = createDevelopmentLicenseFixture();
const firstPartyReceipt = await service.issueFirstPartyReceipt(firstParty.id, firstPartyWebIdentity, "first-party-installation");
const firstPartyValidation = await service.validateEntitlement(firstPartyReceipt, { application: firstPartyWebIdentity, productId: "platform-runtime" });
if (!firstPartyValidation.ok) throw new Error(firstPartyValidation.message);
const thirdPartyActivation = await service.activate({ licenseKey: thirdParty.licenseKey, applicationIdentity: thirdPartyIdentity, pseudonymousDeviceId: "random-installation-a", idempotencyKey: "activation-a" });
const thirdPartyValidation = await service.validateEntitlement(thirdPartyActivation.receipt, { application: thirdPartyIdentity, productId: "platform-runtime" });
if (!thirdPartyValidation.ok) throw new Error(thirdPartyValidation.message);

const entitled = new Set(firstPartyValidation.claims.entitledFeatures);
const host = new FeatureHost({ runtimeVersion: "0.1.0", platform: "node", permittedCapabilities: new Set(["logging", "ui-overlays", "theme", "animation", "accessibility", "app-lifecycle"]) }, { logging: { log: (message: string) => process.stderr.write(`${message}\n`) }, "ui-overlays": {}, theme: {}, animation: {}, accessibility: {}, "app-lifecycle": {} }, { async hasEntitlement(id) { return entitled.has(id); } }, { async verify(manifest) { return /^[a-f0-9]{64}$/.test(manifest.packageChecksum); } });
host.discover(diagnosticsFeatureManifest, new DiagnosticsFeature()); host.discover(uiFeatureManifest, new StatusCardFeature()); host.discover(animationFeatureManifest, new AnimationFeature()); await host.startAll();

const runtime = new AnimationRuntime(compiled.packageBytes, { scene: "Welcome", rendererName: "headless-demo" }); const events: string[] = []; runtime.onEvent((event) => events.push(event)); runtime.setInput("userName", "Platform developer"); runtime.setInput("count", 7); runtime.send("WelcomeFlow", "ready", 0); const entrance = runtime.tick(620); runtime.send("WelcomeFlow", "continue", 700); const transition = runtime.tick(1220);
process.stdout.write(`${JSON.stringify({ pipeline: ["source", "parser", "semantic", "compiler", "flatbuffers", "package-verifier", "ed25519-entitlement", "runtime", "state-machine", "renderer-frame", "host-event"], sourceBytes: Buffer.byteLength(source), packageBytes: compiled.packageBytes.length, sourceHash: compiled.compiled.sourceHash, firstParty: { kind: firstPartyValidation.claims.licenseKind, application: firstPartyValidation.claims.application, features: firstPartyValidation.claims.entitledFeatures }, thirdParty: { kind: thirdPartyValidation.claims.licenseKind, application: thirdPartyValidation.claims.application, features: thirdPartyValidation.claims.entitledFeatures }, featureCompatibility: host.compatibilityReport(), entrance: { state: entrance.activeStateMachines, title: entrance.nodes.find((node) => node.id === "title")?.properties.text }, transition: { state: transition.activeStateMachines, detailsX: transition.nodes.find((node) => node.id === "details")?.properties.x }, events, runtime: runtime.diagnostics }, null, 2)}\n`);
