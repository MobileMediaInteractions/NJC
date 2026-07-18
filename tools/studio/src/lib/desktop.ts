import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { importLottie, type CompatibilityItem, type LottieImportSummary } from "@platform/runtime/importers";
import type { BlueprintLayoutEdge, BlueprintLayoutNode, BlueprintLayoutResult, ExportResult, ImportProgressEvent, SelectedTextFile, TaskResult, TextFile, ToolchainDiagnostic, WorkspaceSnapshot } from "../model/protocol";
import { layoutBlueprintGraphFallback } from "./blueprint-layout";
import demoSource from "../demo/onboarding.pani?raw";
import demoManifest from "../demo/licensed-feature.json?raw";

export const inDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const browserRoot = "/demo/njc-studio";

const browserSnapshot: WorkspaceSnapshot = {
  root: browserRoot,
  name: "njc-studio-demo",
  trusted: true,
  detections: [
    { id: "animation-platform", label: "Animation and feature platform", confidence: 1, evidence: ["Built-in .pani project", "Feature manifest"] },
    { id: "pnpm-monorepo", label: "pnpm monorepo", confidence: 0.99, evidence: ["Browser demonstration fixture"] },
  ],
  files: [
    { path: "animations", name: "animations", kind: "directory", depth: 0, size: 0 },
    { path: "animations/onboarding.pani", name: "onboarding.pani", kind: "file", depth: 1, size: demoSource.length },
    { path: "features", name: "features", kind: "directory", depth: 0, size: 0 },
    { path: "features/licensed-feature.json", name: "licensed-feature.json", kind: "file", depth: 1, size: demoManifest.length },
    { path: "README.md", name: "README.md", kind: "file", depth: 0, size: 240 },
  ],
  tasks: [
    { id: "platform-demo", label: "Run platform vertical slice", program: "pnpm", arguments: ["--dir", "platform", "demo"], workingDirectory: browserRoot, kind: "run" },
    { id: "playground-build", label: "Build example application", program: "pnpm", arguments: ["--dir", "apps/platform-playground", "build"], workingDirectory: browserRoot, kind: "build" },
  ],
  truncated: false,
};

const browserFiles: Record<string, string> = {
  "animations/onboarding.pani": demoSource,
  "features/licensed-feature.json": demoManifest,
  "README.md": "# Built-in NJC Studio project\n\nThis browser-safe fixture demonstrates the real compiler and runtime. Native filesystem and process commands require the Tauri desktop shell.",
};

async function digest(content: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function chooseWorkspace() {
  if (!inDesktop) return browserRoot;
  const selected = await open({ directory: true, multiple: false, title: "Open an NJC Studio workspace" });
  return typeof selected === "string" ? selected : null;
}

export async function defaultWorkspace() {
  return inDesktop ? invoke<string>("default_workspace") : browserRoot;
}

export async function inspectWorkspace(root: string) {
  return inDesktop ? invoke<WorkspaceSnapshot>("inspect_workspace", { root }) : browserSnapshot;
}

export async function trustWorkspace(root: string) {
  return inDesktop ? invoke<boolean>("trust_workspace", { root }) : true;
}

export async function readWorkspaceFile(root: string, relative: string): Promise<TextFile> {
  if (inDesktop) return invoke<TextFile>("read_workspace_file", { root, relative });
  const content = browserFiles[relative];
  if (content === undefined) throw new Error("The browser demonstration exposes only its fixture files.");
  return { path: relative, content, size: content.length, sha256: await digest(content) };
}

export async function writeWorkspaceFile(root: string, relative: string, content: string, expectedSha256: string): Promise<TextFile> {
  if (inDesktop) return invoke<TextFile>("write_workspace_file", { root, relative, content, expectedSha256 });
  browserFiles[relative] = content;
  return { path: relative, content, size: content.length, sha256: await digest(content) };
}

export async function createWorkspaceFile(root: string, relative: string, content: string): Promise<TextFile> {
  if (inDesktop) return invoke<TextFile>("create_workspace_file", { root, relative, content });
  if (browserFiles[relative] !== undefined) throw new Error("A file with that name already exists.");
  browserFiles[relative] = content;
  const directory = relative.split("/").slice(0, -1).join("/");
  if (directory && !browserSnapshot.files.some((entry) => entry.path === directory)) {
    browserSnapshot.files = [...browserSnapshot.files, { path: directory, name: directory.split("/").at(-1) ?? directory, kind: "directory" as const, depth: directory.split("/").length - 1, size: 0 }];
  }
  browserSnapshot.files = [...browserSnapshot.files, { path: relative, name: relative.split("/").at(-1) ?? relative, kind: "file" as const, depth: relative.split("/").length - 1, size: content.length }]
    .sort((left, right) => left.path.localeCompare(right.path));
  return { path: relative, content, size: content.length, sha256: await digest(content) };
}

export async function getToolchains(): Promise<ToolchainDiagnostic[]> {
  if (inDesktop) return invoke<ToolchainDiagnostic[]>("toolchain_diagnostics");
  return [
    { id: "desktop", label: "Tauri native bridge", available: false, summary: "Browser demonstration", remediation: "Launch with pnpm studio:start for native toolchains, files, Git and tasks." },
    { id: "runtime", label: "Animation compiler/runtime", available: true, summary: "Running in this preview" },
  ];
}

export async function executeTask(root: string, taskId: string): Promise<TaskResult> {
  if (inDesktop) return invoke<TaskResult>("run_task", { root, taskId });
  return {
    taskId,
    command: "native desktop task adapter required",
    workingDirectory: root,
    success: false,
    durationMs: 0,
    output: "The integrated browser preview does not execute project processes. Launch the Tauri desktop build to run this task.",
  };
}

export async function getGitStatus(root: string) {
  return inDesktop ? invoke<string>("git_status", { root }) : "## demo/browser-preview\n M animations/onboarding.pani";
}

export async function layoutBlueprintGraph(nodes: BlueprintLayoutNode[], edges: BlueprintLayoutEdge[]): Promise<BlueprintLayoutResult> {
  return inDesktop
    ? invoke<BlueprintLayoutResult>("layout_blueprint_graph", { nodes, edges })
    : layoutBlueprintGraphFallback(nodes, edges);
}

function browserDownload(name: string, type: string, bytes: BlobPart[]) {
  const url = URL.createObjectURL(new Blob(bytes, { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function browserFile(accept = ".pani,.json,application/json,text/plain"): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.click();
  });
}

export type AnimationImportOutcome = {
  file: TextFile | null;
  format: "pani" | "lottie";
  sourceName: string;
  report: CompatibilityItem[];
  summary?: LottieImportSummary;
};
export type ImportProgressHandler = (event: ImportProgressEvent) => void;

async function publishImportProgress(handler: ImportProgressHandler | undefined, event: ImportProgressEvent) {
  handler?.(event);
  if (handler) await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
}

function translatedName(name: string) {
  const stem = name.replace(/\.json$/i, "").replace(/[^A-Za-z0-9._-]/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "imported-lottie";
  return `${stem}.pani`;
}

async function translateLottieSelection(root: string, selected: SelectedTextFile | File, onProgress?: ImportProgressHandler): Promise<AnimationImportOutcome> {
  if (!selected.name.toLowerCase().endsWith(".json")) throw new Error("Choose a Lottie .json file.");
  await publishImportProgress(onProgress, { phase: "read", status: "running", message: `$ lottie read ${selected.name}` });
  const content = selected instanceof File ? await selected.text() : selected.content;
  await publishImportProgress(onProgress, { phase: "read", status: "success", message: `Loaded ${new TextEncoder().encode(content).length.toLocaleString()} bytes of bounded UTF-8 JSON.` });
  await publishImportProgress(onProgress, { phase: "validate", status: "running", message: "$ lottie validate --schema --security --compatibility" });
  const translated = importLottie(content, { packageName: selected.name.replace(/\.json$/i, ""), sceneName: selected.name.replace(/\.json$/i, ""), sourceName: selected.name });
  await publishImportProgress(onProgress, { phase: "validate", status: translated.summary.errors ? "error" : "success", message: `Canvas ${translated.summary.width}×${translated.summary.height} · ${translated.summary.frameRate} FPS · ${translated.summary.layers} layers · ${translated.summary.errors} blocking errors.` });
  for (const item of translated.report) {
    const status = item.disposition === "unsupported_with_error" ? "error" : item.disposition === "approximated" || item.disposition === "ignored_with_warning" ? "warning" : item.disposition === "fully_supported" ? "success" : "info";
    await publishImportProgress(onProgress, { phase: item.disposition === "fully_supported" ? "validate" : "translate", status, message: `[${item.source}] ${item.message}` });
  }
  if (!translated.source) {
    await publishImportProgress(onProgress, { phase: "complete", status: "error", message: "Translation stopped safely. No partial project was written." });
    return { file: null, format: "lottie", sourceName: selected.name, report: translated.report, summary: translated.summary };
  }
  await publishImportProgress(onProgress, { phase: "translate", status: "success", message: `Generated ${translated.summary.components} editable PANI components and deterministic timeline source.` });
  const destination = `animations/${translatedName(selected.name)}`;
  await publishImportProgress(onProgress, { phase: "write", status: "running", message: `$ pani write ${destination}` });
  const file = await createWorkspaceFile(root, destination, translated.source);
  await publishImportProgress(onProgress, { phase: "write", status: "success", message: `Wrote ${file.size.toLocaleString()} bytes with SHA-256 ${file.sha256.slice(0, 12)}…` });
  await publishImportProgress(onProgress, { phase: "write", status: "success", message: "Translation and workspace write complete; handing source to the PANI compiler." });
  return { file, format: "lottie", sourceName: selected.name, report: translated.report, summary: translated.summary };
}

export async function importLottieFile(root: string, onProgress?: ImportProgressHandler): Promise<AnimationImportOutcome | null> {
  let selected: SelectedTextFile | File | null;
  await publishImportProgress(onProgress, { phase: "select", status: "running", message: "$ lottie select --finder --type json" });
  if (inDesktop) {
    const path = await open({ multiple: false, directory: false, title: "Select a Lottie animation to validate and translate", filters: [{ name: "Lottie JSON animation", extensions: ["json"] }] });
    if (typeof path !== "string") { await publishImportProgress(onProgress, { phase: "complete", status: "info", message: "Import cancelled before a file was selected." }); return null; }
    await publishImportProgress(onProgress, { phase: "select", status: "success", message: `Selected ${path.split("/").at(-1) ?? "Lottie JSON"}.` });
    selected = await invoke<SelectedTextFile>("read_lottie_file", { sourcePath: path });
  } else selected = await browserFile(".json,application/json");
  if (!selected) { await publishImportProgress(onProgress, { phase: "complete", status: "info", message: "Import cancelled before a file was selected." }); return null; }
  return translateLottieSelection(root, selected, onProgress);
}

export async function importAnimationFile(root: string, onProgress?: ImportProgressHandler): Promise<AnimationImportOutcome | null> {
  let selected: SelectedTextFile | File | null;
  await publishImportProgress(onProgress, { phase: "select", status: "running", message: "$ animation import --finder --type pani,json" });
  if (inDesktop) {
    const path = await open({ multiple: false, directory: false, title: "Import an animation or translate Lottie JSON", filters: [{ name: "Editable animation", extensions: ["pani", "json"] }] });
    if (typeof path !== "string") { await publishImportProgress(onProgress, { phase: "complete", status: "info", message: "Import cancelled before a file was selected." }); return null; }
    await publishImportProgress(onProgress, { phase: "select", status: "success", message: `Selected ${path.split("/").at(-1) ?? "animation"}.` });
    if (path.toLowerCase().endsWith(".pani")) {
      await publishImportProgress(onProgress, { phase: "write", status: "running", message: "$ pani import --copy --no-overwrite" });
      const file = await invoke<TextFile>("import_animation_file", { root, sourcePath: path });
      await publishImportProgress(onProgress, { phase: "write", status: "success", message: `Copied ${file.path}; handing source to the PANI compiler.` });
      return { file, format: "pani", sourceName: file.path.split("/").at(-1) ?? "animation.pani", report: [{ source: "document", disposition: "fully_supported", message: "PANI source copied into this workspace without translation" }] };
    }
    selected = await invoke<SelectedTextFile>("read_lottie_file", { sourcePath: path });
  } else {
    selected = await browserFile();
    if (!selected) { await publishImportProgress(onProgress, { phase: "complete", status: "info", message: "Import cancelled before a file was selected." }); return null; }
    if (selected.name.toLowerCase().endsWith(".pani")) {
      const safeName = selected.name.replace(/[^A-Za-z0-9._-]/g, "-");
      await publishImportProgress(onProgress, { phase: "write", status: "running", message: "$ pani import --copy --no-overwrite" });
      const file = await createWorkspaceFile(root, `animations/${safeName}`, await selected.text());
      await publishImportProgress(onProgress, { phase: "write", status: "success", message: `Copied ${file.path}; handing source to the PANI compiler.` });
      return { file, format: "pani", sourceName: selected.name, report: [{ source: "document", disposition: "fully_supported", message: "PANI source copied into this workspace without translation" }] };
    }
  }
  return translateLottieSelection(root, selected, onProgress);
}

export async function exportAnimationSource(defaultName: string, content: string): Promise<ExportResult | null> {
  if (!inDesktop) {
    browserDownload(defaultName, "text/plain;charset=utf-8", [content]);
    return { path: defaultName, size: new TextEncoder().encode(content).length, durationMs: 0 };
  }
  const destination = await save({ title: "Export animation source", defaultPath: defaultName, filters: [{ name: "NJC animation source", extensions: ["pani"] }] });
  return destination ? invoke<ExportResult>("export_animation_source", { destination, content }) : null;
}

export async function exportAnimationPackage(defaultName: string, bytes: Uint8Array): Promise<ExportResult | null> {
  if (!inDesktop) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    browserDownload(defaultName, "application/octet-stream", [copy.buffer]);
    return { path: defaultName, size: bytes.length, durationMs: 0 };
  }
  const destination = await save({ title: "Export verified runtime package", defaultPath: defaultName, filters: [{ name: "PANI runtime container", extensions: ["pani.bin"] }] });
  return destination ? invoke<ExportResult>("export_animation_package", { destination, bytes: Array.from(bytes) }) : null;
}

export async function exportAnimationVideo(defaultName: string, frames: Uint8Array[], width: number, height: number, fps: number): Promise<ExportResult | null> {
  if (!inDesktop) throw new Error("Rendered MP4 export requires NJC Studio Desktop and FFmpeg.");
  const destination = await save({ title: "Export rendered MP4", defaultPath: defaultName, filters: [{ name: "MPEG-4 video", extensions: ["mp4"] }] });
  return destination ? invoke<ExportResult>("export_animation_video", { destination, frames: frames.map((frame) => Array.from(frame)), width, height, fps }) : null;
}

export async function onStudioMenu(handler: (command: string) => void): Promise<UnlistenFn> {
  if (!inDesktop) return () => undefined;
  return listen<string>("studio-menu", (event) => handler(event.payload));
}
