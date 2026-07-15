import { notFound } from "next/navigation";
import { AnimationRuntime, compileAnimation } from "@platform/runtime/animation";
import { PlatformShowcase } from "./showcase";

const source = `language 1
package njcourier;
scene BreakingNews {
  input headline: string = "A verified local-news alert";
  input accent: string = "#c49545";
  component rule rect { x: 24dp; y: 24dp; width: 8dp; height: 116dp; opacity: 0; fill: "\${accent}"; cornerRadius: 4dp; }
  component label text { text: "BREAKING · MIDDLESEX"; x: 52dp; y: 30dp; opacity: 0; color: "\${accent}"; }
  component headline text { text: "\${headline}"; x: 52dp; y: 68dp; opacity: 0; scale: 0.96; }
  component openButton host { hostId: "open-story"; y: 20dp; opacity: 0; cornerRadius: 18dp; }
  timeline reveal 600ms {
    track rule.opacity { 0ms: 0; 180ms: 1 ease outCubic; }
    track label.opacity { 80ms: 0; 300ms: 1 ease outCubic; }
    track headline.opacity { 140ms: 0; 420ms: 1 ease outCubic; }
    track headline.scale { 140ms: 0.96; 600ms: 1 ease spring; }
    track openButton.opacity { 240ms: 0; 520ms: 1 ease outCubic; }
    track openButton.y { 240ms: 20; 600ms: 0 ease spring; }
  }
}`;

export default function PlatformDevelopmentPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const compiled = compileAnimation(source);
  const samples = [0, 100, 200, 300, 400, 500, 600].map((timeMs) => {
    const runtime = new AnimationRuntime(compiled.packageBytes, { scene: "BreakingNews", rendererName: "njcourier-web-showcase" });
    runtime.setInput("headline", "Transit vote reshapes the Route 1 corridor");
    runtime.play("reveal", 0);
    return runtime.seek(timeMs, 0);
  });
  return <PlatformShowcase
    samples={samples}
    packageBytes={compiled.packageBytes.length}
    sourceHash={compiled.compiled.sourceHash}
    canonicalSource={compiled.canonicalSource}
    requiredFeatures={compiled.compiled.requiredFeatures}
  />;
}
