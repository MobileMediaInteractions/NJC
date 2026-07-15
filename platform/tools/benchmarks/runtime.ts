import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { AnimationRuntime, compileAnimation } from "../../src/animation/index";

const source = await readFile(fileURLToPath(new URL("../../examples/animation-showcase/welcome.pani", import.meta.url)), "utf8");
const beforeMemory = process.memoryUsage().heapUsed;
const compileStart = performance.now();
const compiled = compileAnimation(source);
const compileMs = performance.now() - compileStart;
const loads: number[] = [];
for (let index = 0; index < 100; index += 1) {
  const start = performance.now(); new AnimationRuntime(compiled.packageBytes, { scene: "Welcome" }); loads.push(performance.now() - start);
}
const runtime = new AnimationRuntime(compiled.packageBytes, { scene: "Welcome" }); runtime.play("entrance", 0);
const tickStart = performance.now();
for (let index = 0; index < 20_000; index += 1) runtime.tick(index % 621);
const frameEvaluationMs = (performance.now() - tickStart) / 20_000;
const afterMemory = process.memoryUsage().heapUsed;
const sorted = [...loads].sort((a, b) => a - b);
const result = {
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  sourceBytes: Buffer.byteLength(source),
  packageBytes: compiled.packageBytes.length,
  compileMs,
  loadMedianMs: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
  loadP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
  frameEvaluationMeanMs: frameEvaluationMs,
  heapDeltaBytes: afterMemory - beforeMemory,
  budgets: { compileMs: 100, loadP95Ms: 20, frameEvaluationMeanMs: 0.5, packageBytes: 64_000 },
};
const failures = Object.entries(result.budgets).filter(([name, budget]) => result[name as keyof typeof result] as number > budget);
process.stdout.write(`${JSON.stringify({ ...result, passed: failures.length === 0, failures: failures.map(([name, budget]) => ({ name, budget, actual: result[name as keyof typeof result] })) }, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
