import { z } from "zod";

const identifier = z.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/).max(128);
const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
const stringMap = z.record(z.string(), z.unknown());

export const hostCapabilities = [
  "logging", "analytics", "secure-storage", "storage", "network", "authentication",
  "database", "files", "camera", "microphone", "photos", "notifications", "background-work",
  "deep-links", "navigation", "haptics", "clipboard", "location", "app-lifecycle", "theme",
  "localization", "accessibility", "ui-overlays", "animation", "device-information", "feature-configuration",
] as const;
export type HostCapability = (typeof hostCapabilities)[number];

export const featureManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: identifier,
  displayName: z.string().min(1).max(120),
  description: z.string().max(1000),
  version: semver,
  publisher: identifier,
  minimumHostRuntime: semver,
  maximumTestedHostRuntime: semver,
  supportedPlatforms: z.array(z.enum(["web", "ios", "android", "tvos", "androidtv", "roku", "node"])).min(1),
  entryPoint: z.string().min(1).max(300),
  lifecyclePolicy: z.object({ start: z.enum(["eager", "lazy"]), background: z.enum(["suspend", "continue", "stop"]), failure: z.enum(["isolate", "fail-host"]) }),
  killSwitchKey: identifier,
  requiredHostCapabilities: z.array(z.enum(hostCapabilities)).default([]),
  optionalHostCapabilities: z.array(z.enum(hostCapabilities)).default([]),
  licenseEntitlement: identifier,
  dependencies: z.array(z.object({ id: identifier, range: z.string().min(1).max(50), optional: z.boolean().default(false) })).default([]),
  conflicts: z.array(identifier).default([]),
  configurationSchema: stringMap.default({}),
  commands: z.array(z.object({ id: identifier, inputSchema: stringMap.default({}), outputSchema: stringMap.default({}) })).default([]),
  eventsEmitted: z.array(z.object({ id: identifier, payloadSchema: stringMap.default({}) })).default([]),
  eventsConsumed: z.array(z.object({ id: identifier, payloadSchema: stringMap.default({}) })).default([]),
  uiSurfaces: z.array(z.object({ id: identifier, kind: z.enum(["screen", "panel", "overlay", "component", "settings"]) })).default([]),
  backgroundServices: z.array(identifier).default([]),
  permissions: z.array(z.string().max(120)).default([]),
  dataMigrations: z.array(z.object({ id: identifier, from: semver, to: semver, rollbackId: identifier.optional() })).default([]),
  featureFlags: z.array(identifier).default([]),
  privacy: z.object({ dataCategories: z.array(identifier), purposes: z.array(z.string().min(1).max(200)), retentionDays: z.number().int().nonnegative().max(36_500), sharesExternally: z.boolean() }),
  resourceRequirements: z.object({ maxMemoryMb: z.number().int().positive().max(2048), maxStorageMb: z.number().int().nonnegative().max(10240), networkRequired: z.boolean() }),
  packageSignature: z.object({ algorithm: z.literal("ed25519"), keyId: identifier, value: z.string().min(40).max(256) }).optional(),
  packageChecksum: z.string().regex(/^[a-f0-9]{64}$/),
});
export type FeatureManifest = z.infer<typeof featureManifestSchema>;

export function parseFeatureManifest(input: unknown) {
  return featureManifestSchema.parse(input);
}
