import type { FeatureManifest, HostCapability } from "./feature-manifest";
import { parseFeatureManifest } from "./feature-manifest";
import { satisfiesRange, versionInRange } from "./versioning";

export type FeatureLifecycleState = "discovered" | "verified" | "resolved" | "entitled" | "registered" | "initialized" | "started" | "suspended" | "stopped" | "disposed";
export type HostServices = Partial<Record<HostCapability, unknown>>;
export type FeatureContext = { manifest: FeatureManifest; services: Readonly<HostServices>; emitDiagnostic: (code: string, message: string) => void };
export interface FeatureModule {
  register?(context: FeatureContext): void | Promise<void>;
  initialize?(context: FeatureContext): void | Promise<void>;
  start?(context: FeatureContext): void | Promise<void>;
  suspend?(context: FeatureContext): void | Promise<void>;
  resume?(context: FeatureContext): void | Promise<void>;
  stop?(context: FeatureContext): void | Promise<void>;
  dispose?(context: FeatureContext): void | Promise<void>;
  upgrade?(fromVersion: string, context: FeatureContext): void | Promise<void>;
  rollback?(toVersion: string, context: FeatureContext): void | Promise<void>;
}
export type EntitlementProvider = { hasEntitlement(entitlement: string): Promise<boolean> };
export type PackageVerifier = { verify(manifest: FeatureManifest): Promise<boolean> };
export type HostPolicy = { runtimeVersion: string; platform: FeatureManifest["supportedPlatforms"][number]; permittedCapabilities: ReadonlySet<HostCapability>; killSwitches?: ReadonlySet<string> };
type Installed = { manifest: FeatureManifest; module: FeatureModule; state: FeatureLifecycleState; context: FeatureContext };

export class FeatureHost {
  readonly #installed = new Map<string, Installed>(); readonly diagnostics: { code: string; featureId: string; message: string }[] = [];
  constructor(readonly policy: HostPolicy, readonly services: HostServices, readonly entitlements: EntitlementProvider, readonly packages: PackageVerifier) {}
  discover(manifestInput: unknown, module: FeatureModule) {
    const manifest = parseFeatureManifest(manifestInput);
    if (this.#installed.has(manifest.id)) throw new Error(`Feature already discovered: ${manifest.id}`);
    const context = { manifest, services: {} as HostServices, emitDiagnostic: (code: string, message: string) => this.diagnostics.push({ code, featureId: manifest.id, message }) };
    this.#installed.set(manifest.id, { manifest, module, state: "discovered", context }); return manifest;
  }
  async verifyAll() {
    for (const installed of this.#installed.values()) {
      const { manifest } = installed;
      if (this.policy.killSwitches?.has(manifest.killSwitchKey)) throw new Error(`Feature disabled by host policy: ${manifest.id}`);
      if (!manifest.supportedPlatforms.includes(this.policy.platform)) throw new Error(`Feature ${manifest.id} does not support ${this.policy.platform}`);
      if (!versionInRange(this.policy.runtimeVersion, manifest.minimumHostRuntime, manifest.maximumTestedHostRuntime)) throw new Error(`Feature ${manifest.id} is incompatible with runtime ${this.policy.runtimeVersion}`);
      if (!(await this.packages.verify(manifest))) throw new Error(`Feature package verification failed: ${manifest.id}`);
      const missing = manifest.requiredHostCapabilities.filter((capability) => !this.policy.permittedCapabilities.has(capability) || this.services[capability] === undefined);
      if (missing.length) throw new Error(`Feature ${manifest.id} missing required capabilities: ${missing.join(", ")}`);
      installed.context.services = Object.freeze(Object.fromEntries([...manifest.requiredHostCapabilities, ...manifest.optionalHostCapabilities].filter((capability) => this.policy.permittedCapabilities.has(capability) && this.services[capability] !== undefined).map((capability) => [capability, this.services[capability]]))) as HostServices;
      installed.state = "verified";
    }
  }
  resolveOrder() {
    const visiting = new Set<string>(); const visited = new Set<string>(); const ordered: Installed[] = [];
    const visit = (feature: Installed) => {
      if (visiting.has(feature.manifest.id)) throw new Error(`Circular feature dependency at ${feature.manifest.id}`);
      if (visited.has(feature.manifest.id)) return;
      visiting.add(feature.manifest.id);
      for (const conflict of feature.manifest.conflicts) if (this.#installed.has(conflict)) throw new Error(`Feature conflict: ${feature.manifest.id} conflicts with ${conflict}`);
      for (const dependency of feature.manifest.dependencies) { const target = this.#installed.get(dependency.id); if (!target) { if (!dependency.optional) throw new Error(`Missing feature dependency ${dependency.id}`); continue; } if (!satisfiesRange(target.manifest.version, dependency.range)) throw new Error(`Incompatible dependency ${dependency.id}@${target.manifest.version}`); visit(target); }
      visiting.delete(feature.manifest.id); visited.add(feature.manifest.id); feature.state = "resolved"; ordered.push(feature);
    };
    for (const feature of this.#installed.values()) visit(feature); return ordered;
  }
  async startAll() {
    await this.verifyAll(); const ordered = this.resolveOrder();
    for (const feature of ordered) { if (!(await this.entitlements.hasEntitlement(feature.manifest.licenseEntitlement))) throw new Error(`Missing entitlement ${feature.manifest.licenseEntitlement}`); feature.state = "entitled"; await feature.module.register?.(feature.context); feature.state = "registered"; await feature.module.initialize?.(feature.context); feature.state = "initialized"; await feature.module.start?.(feature.context); feature.state = "started"; }
  }
  async suspendAll() { for (const feature of [...this.#installed.values()].reverse()) if (feature.state === "started") { await feature.module.suspend?.(feature.context); feature.state = "suspended"; } }
  async resumeAll() { for (const feature of this.resolveOrder()) if (feature.state === "suspended") { await feature.module.resume?.(feature.context); feature.state = "started"; } }
  async stopAll() { for (const feature of [...this.#installed.values()].reverse()) if (feature.state === "started" || feature.state === "suspended") { await feature.module.stop?.(feature.context); feature.state = "stopped"; } }
  async upgradeFeature(id: string, fromVersion: string) { const feature = this.#installed.get(id); if (!feature || !["initialized", "started", "suspended", "stopped"].includes(feature.state)) throw new Error(`Feature is not ready to upgrade: ${id}`); await feature.module.upgrade?.(fromVersion, feature.context); feature.context.emitDiagnostic("FEATURE_UPGRADED", `${fromVersion} -> ${feature.manifest.version}`); }
  async rollbackFeature(id: string, toVersion: string) { const feature = this.#installed.get(id); if (!feature || !["initialized", "started", "suspended", "stopped"].includes(feature.state)) throw new Error(`Feature is not ready to roll back: ${id}`); await feature.module.rollback?.(toVersion, feature.context); feature.context.emitDiagnostic("FEATURE_ROLLED_BACK", `${feature.manifest.version} -> ${toVersion}`); }
  async disposeAll() { await this.stopAll(); for (const feature of [...this.#installed.values()].reverse()) { await feature.module.dispose?.(feature.context); feature.state = "disposed"; } }
  compatibilityReport() { return [...this.#installed.values()].map(({ manifest, state }) => ({ id: manifest.id, version: manifest.version, state, platform: this.policy.platform, runtime: this.policy.runtimeVersion, capabilities: { required: manifest.requiredHostCapabilities, optionalGranted: manifest.optionalHostCapabilities.filter((capability) => this.policy.permittedCapabilities.has(capability) && this.services[capability] !== undefined) } })); }
}
