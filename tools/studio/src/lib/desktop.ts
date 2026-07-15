import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { TaskResult, TextFile, ToolchainDiagnostic, WorkspaceSnapshot } from "../model/protocol";
import demoSource from "../demo/onboarding.pani?raw";
import demoManifest from "../demo/licensed-feature.json?raw";

export const inDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const browserRoot = "/demo/platform-studio";

const browserSnapshot: WorkspaceSnapshot = {
  root: browserRoot,
  name: "studio-demo",
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
  "README.md": "# Built-in Studio project\n\nThis browser-safe fixture demonstrates the real compiler and runtime. Native filesystem and process commands require the Tauri desktop shell.",
};

async function digest(content: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function chooseWorkspace() {
  if (!inDesktop) return browserRoot;
  const selected = await open({ directory: true, multiple: false, title: "Open a Studio workspace" });
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
