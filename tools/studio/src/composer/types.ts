import type { FeatureDiagnostic, FeatureIR } from "@visual-feature/model";
import type { FeatureRuntime, RuntimeSnapshot } from "@visual-feature/runtime";
import type { ReturnTypeCompileFeature } from "./utilities";

export type ComposerMode = "design" | "behavior" | "data" | "motion" | "test" | "code";
export type SimulationOutcome = "success" | "failure";
export type ComposerSession = {
  feature: FeatureIR;
  compilation: ReturnTypeCompileFeature;
  runtime: FeatureRuntime;
  snapshot: RuntimeSnapshot;
  diagnostics: FeatureDiagnostic[];
  outcome: SimulationOutcome;
  reducedMotion: boolean;
};
