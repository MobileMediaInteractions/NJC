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

export type BottomPanel = "problems" | "output" | "terminal" | "performance" | "git" | "package" | "license" | "devices";
export type EditorMode = "source" | "visual" | "state" | "composer";
export type ThemeMode = "dark" | "light";
export type DeviceProfile = { id: string; label: string; width: number; height: number; radius: number; density: number; safeTop: number };
