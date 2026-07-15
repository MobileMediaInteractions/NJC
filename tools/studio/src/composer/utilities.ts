import { compileFeature } from "@visual-feature/compiler";
import type { FeatureComponent, FeatureIR, JsonValue } from "@visual-feature/model";
import { createMockHost, FeatureRuntime } from "@visual-feature/runtime";
import type { SimulationOutcome } from "./types";

export type ReturnTypeCompileFeature = ReturnType<typeof compileFeature>;

export function createSessionRuntime(feature: FeatureIR, outcome: SimulationOutcome, reducedMotion: boolean) {
  const compilation = compileFeature(feature);
  const runtime = new FeatureRuntime(compilation.packageBytes, createMockHost(feature, outcome), { reducedMotion });
  return { compilation, runtime, snapshot: runtime.snapshot() };
}

export function findComponent(feature: FeatureIR, id: string): FeatureComponent | undefined {
  const visit = (component: FeatureComponent): FeatureComponent | undefined => component.id === id ? component : component.children.map(visit).find(Boolean);
  return feature.screens.map((screen) => visit(screen.root)).find(Boolean);
}

export function mutateComponent(feature: FeatureIR, id: string, mutate: (component: FeatureComponent) => void) {
  const next = structuredClone(feature); const component = findComponent(next, id); if (!component) throw new Error(`Component '${id}' is missing.`); mutate(component); return next;
}

export function propertyValue(component: FeatureComponent, name: string, fallback: JsonValue): JsonValue {
  return component.properties[name] ?? fallback;
}
