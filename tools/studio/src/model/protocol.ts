export type Detection = {
  id: string;
  label: string;
  confidence: number;
  evidence: string[];
};

export type FileEntry = {
  path: string;
  name: string;
  kind: "file" | "directory";
  depth: number;
  size: number;
};

export type TaskDefinition = {
  id: string;
  label: string;
  program: string;
  arguments: string[];
  workingDirectory: string;
  kind: "build" | "run" | "test";
};

export type WorkspaceSnapshot = {
  root: string;
  name: string;
  trusted: boolean;
  detections: Detection[];
  files: FileEntry[];
  tasks: TaskDefinition[];
  truncated: boolean;
};

export type TextFile = {
  path: string;
  content: string;
  sha256: string;
  size: number;
};

export type SelectedTextFile = {
  name: string;
  content: string;
  size: number;
};

export type ImportProgressEvent = {
  phase: "select" | "read" | "validate" | "translate" | "write" | "complete";
  status: "running" | "success" | "warning" | "error" | "info";
  message: string;
};

export type ImportConsoleLine = ImportProgressEvent & {
  id: number;
  timestamp: string;
};

export type ToolchainDiagnostic = {
  id: string;
  label: string;
  available: boolean;
  summary: string;
  remediation?: string;
};

export type TaskResult = {
  taskId: string;
  command: string;
  workingDirectory: string;
  success: boolean;
  exitCode?: number;
  durationMs: number;
  output: string;
};

export type BlueprintLayoutNode = {
  id: string;
  width?: number;
  height?: number;
};

export type BlueprintLayoutEdge = {
  fromNodeId: string;
  toNodeId: string;
};

export type BlueprintLayoutResult = {
  positions: { id: string; x: number; y: number; layer: number }[];
  width: number;
  height: number;
  durationMicros: number;
  cyclic: boolean;
  engine: "rust-scc-layered-v1" | "typescript-scc-layered-v1";
};

export type ExportResult = {
  path: string;
  size: number;
  frames?: number;
  durationMs: number;
  encoder?: string;
};

export type BottomPanel = "problems" | "output" | "import" | "terminal" | "performance" | "git" | "package" | "license" | "devices";
export type EditorMode = "source" | "visual" | "state" | "composer";
export type ThemeMode = "dark" | "light";
export type DeviceProfile = { id: string; label: string; width: number; height: number; radius: number; density: number; safeTop: number };
