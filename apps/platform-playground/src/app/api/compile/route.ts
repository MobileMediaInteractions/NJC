import { compileAnimation } from "@platform/runtime/animation";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
const schema = z.object({ source: z.string().min(1).max(1_000_000) }).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Source must be between 1 byte and 1 MB." }, { status: 400 });
  try {
    const result = compileAnimation(parsed.data.source);
    return NextResponse.json({
      package: Buffer.from(result.packageBytes).toString("base64"),
      bytes: result.packageBytes.length,
      sourceHash: result.compiled.sourceHash,
      canonicalSource: result.canonicalSource,
      scenes: result.compiled.scenes.map((scene) => ({
        name: scene.name,
        timelines: scene.timelines.map(({ name, durationMs }) => ({ name, durationMs })),
        inputs: scene.inputs.map(({ name, type, defaultValue }) => ({ name, type, defaultValue })),
      })),
      requiredFeatures: result.compiled.requiredFeatures,
      diagnostics: result.diagnostics,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Compilation failed" }, { status: 422 });
  }
}
