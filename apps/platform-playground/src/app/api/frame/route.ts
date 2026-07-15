import { AnimationRuntime } from "@platform/runtime/animation";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
const schema = z.object({
  package: z.string().min(1).max(24_000_000),
  scene: z.string().min(1).max(200),
  timeline: z.string().min(1).max(200),
  timeMs: z.number().min(0).max(3_600_000),
  reducedMotion: z.boolean().default(false),
  inputs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
}).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Frame request is invalid." }, { status: 400 });
  try {
    const runtime = new AnimationRuntime(Buffer.from(parsed.data.package, "base64"), {
      scene: parsed.data.scene,
      reducedMotion: parsed.data.reducedMotion,
      rendererName: "playground-server",
    });
    for (const [name, value] of Object.entries(parsed.data.inputs)) runtime.setInput(name, value);
    runtime.play(parsed.data.timeline, 0);
    const frame = runtime.seek(parsed.data.timeMs, 0);
    return NextResponse.json({ frame, diagnostics: runtime.diagnostics });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Frame evaluation failed" }, { status: 422 });
  }
}
