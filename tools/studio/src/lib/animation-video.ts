import { AnimationRuntime, type RenderFrame, type RenderNode } from "@platform/runtime/animation";
import type { ThemeMode } from "../model/protocol";

const maximumVideoFrames = 3_600;

export function videoFrameTimes(durationMs: number, fps: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 120_000) throw new Error("MP4 timeline duration must be between 0 and 120 seconds.");
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error("MP4 frame rate must be between 1 and 60 FPS.");
  const count = Math.ceil(durationMs / 1_000 * fps) + 1;
  if (count > maximumVideoFrames) throw new Error(`MP4 export exceeds the ${maximumVideoFrames.toLocaleString()} frame limit.`);
  return Array.from({ length: count }, (_, index) => Math.min(durationMs, index * 1_000 / fps));
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(source: string) {
  const cached = imageCache.get(source);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    if (!/^(?:https?:|data:|blob:)/.test(source)) { resolve(null); return; }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
  imageCache.set(source, pending);
  return pending;
}

function numberProperty(node: RenderNode, name: string, fallback: number) {
  const value = node.properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, Math.max(0, Math.min(radius, Math.min(width, height) / 2)));
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  lines.slice(0, 8).forEach((value, index) => context.fillText(value, 0, index * 34));
}

async function drawNode(context: CanvasRenderingContext2D, node: RenderNode, theme: ThemeMode) {
  const width = numberProperty(node, "width", node.kind === "text" ? 330 : 80);
  const height = numberProperty(node, "height", node.kind === "text" ? 80 : 80);
  const x = numberProperty(node, "x", 0);
  const y = numberProperty(node, "y", 0);
  const scale = numberProperty(node, "scale", 1);
  const rotation = numberProperty(node, "rotation", 0) * Math.PI / 180;
  const radius = numberProperty(node, "cornerRadius", 0);
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, numberProperty(node, "opacity", 1)));
  context.translate(x + width / 2, y + height / 2);
  context.rotate(rotation);
  context.scale(scale, scale);
  context.translate(-width / 2, -height / 2);
  if (node.kind === "rect" || node.kind === "host") {
    context.fillStyle = String(node.properties.fill ?? (node.kind === "host" ? "#173e32" : "#d7ded9"));
    roundedRect(context, 0, 0, width, height, radius);
    context.fill();
    if (node.kind === "host") {
      context.fillStyle = "#ffffff"; context.font = "600 22px system-ui, sans-serif"; context.textBaseline = "middle";
      context.fillText(String(node.properties.text ?? "Continue →"), 18, height / 2);
    }
  } else if (node.kind === "text") {
    context.fillStyle = String(node.properties.color ?? (theme === "dark" ? "#f5f2eb" : "#17231f"));
    context.font = `${String(node.properties.fontWeight ?? "600")} ${numberProperty(node, "fontSize", 28)}px system-ui, sans-serif`;
    context.textBaseline = "top";
    drawWrappedText(context, String(node.properties.text ?? node.id), width);
  } else if (node.kind === "path") {
    context.strokeStyle = String(node.properties.fill ?? "#2d6a55"); context.lineWidth = numberProperty(node, "strokeWidth", 5); context.lineCap = "round";
    try { context.stroke(new Path2D(String(node.properties.path ?? ""))); } catch { /* Invalid paths are already compiler diagnostics; omit defensively. */ }
  } else if (node.kind === "image") {
    const source = String(node.properties.source ?? "");
    const image = await loadImage(source);
    if (image) context.drawImage(image, 0, 0, width, height);
    else {
      context.fillStyle = theme === "dark" ? "#26312c" : "#e1e5e2"; roundedRect(context, 0, 0, width, height, radius); context.fill();
      context.fillStyle = theme === "dark" ? "#9eaaa4" : "#66716b"; context.font = "14px system-ui, sans-serif"; context.fillText("Image", 12, 24);
    }
  }
  context.restore();
}

async function framePng(frame: RenderFrame, width: number, height: number, theme: ThemeMode) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This webview cannot create the 2D canvas required for MP4 export.");
  context.fillStyle = theme === "dark" ? "#101512" : "#f6f1e8";
  context.fillRect(0, 0, width, height);
  for (const node of frame.nodes) await drawNode(context, node, theme);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not render an MP4 frame.")), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function renderAnimationVideoFrames(options: {
  packageBytes: Uint8Array;
  sceneName: string;
  timelineName: string;
  width: number;
  height: number;
  fps: number;
  theme: ThemeMode;
  reducedMotion: boolean;
  onProgress?: (completed: number, total: number) => void;
}) {
  const runtime = new AnimationRuntime(options.packageBytes, { scene: options.sceneName, reducedMotion: options.reducedMotion, rendererName: "studio-mp4-canvas" });
  const requested = options.reducedMotion && runtime.scene.reducedMotionTimeline ? runtime.scene.reducedMotionTimeline : options.timelineName;
  const timeline = runtime.scene.timelines.find((item) => item.name === requested);
  if (!timeline) throw new Error(`Timeline '${requested}' does not exist in scene '${options.sceneName}'.`);
  const times = videoFrameTimes(timeline.durationMs, options.fps);
  runtime.play(requested, 0, "replace");
  const frames: Uint8Array[] = [];
  for (let index = 0; index < times.length; index += 1) {
    frames.push(await framePng(runtime.seek(times[index]!, 0), options.width, options.height, options.theme));
    options.onProgress?.(index + 1, times.length);
  }
  return frames;
}
