import { AnimationLanguageService } from "@platform/runtime/tooling";
import { compileAnimation, type RenderFrame } from "@platform/runtime/animation";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Explorer } from "../project-system/Explorer";
import { DevicePreview, type PreviewHandle } from "../preview/DevicePreview";
import { TimelinePanel } from "../timeline/TimelinePanel";
import { StateMachinePanel } from "../graph/StateMachinePanel";
import { Inspector } from "../panels/Inspector";
import { BottomPanel, type PackageInfo, type PerformanceSample } from "../panels/BottomPanel";
import { VisualCanvas } from "../canvas/VisualCanvas";
import { useDocumentHistory } from "../hooks/use-document-history";
import { chooseWorkspace, createWorkspaceFile, defaultWorkspace, executeTask, exportAnimationPackage, exportAnimationSource, exportAnimationVideo, getGitStatus, getToolchains, importAnimationFile, inspectWorkspace, onStudioMenu, readWorkspaceFile, trustWorkspace, writeWorkspaceFile } from "../lib/desktop";
import { updateComponentProperty, updateKeyframe } from "../lib/structured-edits";
import type { BottomPanel as BottomPanelName, DeviceProfile, EditorMode, TextFile, ThemeMode, ToolchainDiagnostic, WorkspaceSnapshot } from "../model/protocol";
import demoSource from "../demo/onboarding.pani?raw";
import { FeatureComposer } from "../composer/FeatureComposer";
import { CommandPalette, type StudioCommand } from "../components/CommandPalette";
import { NewAnimationDialog } from "../components/NewAnimationDialog";
import { ExportDialog, type AnimationExportKind } from "../components/ExportDialog";
import { createAnimationSource, type AnimationTemplateId } from "../lib/animation-templates";
import { renderAnimationVideoFrames } from "../lib/animation-video";

const language = new AnimationLanguageService();
const SourceEditor = lazy(() => import("../editors/SourceEditor").then((module) => ({ default: module.SourceEditor })));
const devices: DeviceProfile[] = [
  { id: "phone-compact", label: "Compact phone", width: 390, height: 844, radius: 42, density: 3, safeTop: 48 },
  { id: "phone-large", label: "Large phone", width: 430, height: 932, radius: 48, density: 3, safeTop: 54 },
  { id: "tablet", label: "Tablet", width: 820, height: 1180, radius: 24, density: 2, safeTop: 30 },
];

function compileSource(source: string) {
  const start = performance.now();
  try {
    const result = compileAnimation(source);
    return { result, error: null, duration: performance.now() - start };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Compilation failed", duration: performance.now() - start };
  }
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [file, setFile] = useState<TextFile | null>(null);
  const recoveryKey = `njc-studio:recovery:${workspace?.root ?? "demo"}:${file?.path ?? "onboarding.pani"}`;
  const [savedSource, setSavedSource] = useState(demoSource);
  const document = useDocumentHistory(demoSource, recoveryKey, savedSource);
  const [baseHash, setBaseHash] = useState("");
  const [mode, setMode] = useState<EditorMode>("source");
  const [bottomPanel, setBottomPanel] = useState<BottomPanelName>("problems");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [device, setDevice] = useState(devices[0]!);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("title");
  const [selectedTimeline, setSelectedTimeline] = useState("entrance");
  const [frame, setFrame] = useState<RenderFrame | null>(null);
  const [trace, setTrace] = useState<string[]>(["OnboardingFlow entered loading"]);
  const [output, setOutput] = useState<string[]>([]);
  const [git, setGit] = useState("");
  const [toolchains, setToolchains] = useState<ToolchainDiagnostic[]>([]);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newAnimationOpen, setNewAnimationOpen] = useState(false);
  const [creatingAnimation, setCreatingAnimation] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [initialExportKind, setInitialExportKind] = useState<AnimationExportKind>("source");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => {
    try { return localStorage.getItem("njc-studio:autosave-enabled") !== "false"; } catch { return true; }
  });
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showBottom, setShowBottom] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(236);
  const [inspectorWidth, setInspectorWidth] = useState(332);
  const preview = useRef<PreviewHandle>(null);
  const sourceRef = useRef(document.source);
  const savingRef = useRef(false);
  const failedAutosaveSourceRef = useRef<string | null>(null);
  const frameTimes = useRef<number[]>([]);
  const frameCount = useRef(0);
  const [performanceSample, setPerformanceSample] = useState<PerformanceSample>({ fps: 60, frameMs: 16.7, evaluationMs: 0, packageBytes: 0, compilerMs: 0, frames: 0 });

  const isAnimation = (file?.path ?? "").endsWith(".pani");
  const dirty = document.source !== savedSource;
  sourceRef.current = document.source;
  const compilation = useMemo(() => isAnimation ? compileSource(document.source) : { result: null, error: null, duration: 0 }, [document.source, isAnimation]);
  const diagnostics = useMemo(() => isAnimation ? language.validate(document.source) : [], [document.source, isAnimation]);
  const scene = compilation.result?.compiled.scenes[0];
  const selectedComponent = scene?.components.find((component) => component.id === selectedId);
  const activeMachine = scene?.machines[0];
  const packageInfo: PackageInfo = compilation.result ? {
    minimumRuntime: compilation.result.compiled.minimumRuntime,
    compilerVersion: compilation.result.compiled.compilerVersion,
    sourceHash: compilation.result.compiled.sourceHash,
    features: compilation.result.compiled.requiredFeatures,
    scenes: compilation.result.compiled.scenes.length,
    timelines: compilation.result.compiled.scenes.reduce((sum, item) => sum + item.timelines.length, 0),
    machines: compilation.result.compiled.scenes.reduce((sum, item) => sum + item.machines.length, 0),
    packageBytes: compilation.result.packageBytes.length,
  } : null;

  const resetDocument = document.reset;
  const clearRecovery = document.clearRecovery;
  const openFile = useCallback(async (path: string, snapshot: WorkspaceSnapshot) => {
    try {
      const next = await readWorkspaceFile(snapshot.root, path);
      setFile(next); setBaseHash(next.sha256); setSavedSource(next.content);
      const key = `njc-studio:recovery:${snapshot.root}:${path}`;
      let recovered: string | null = null;
      try { recovered = localStorage.getItem(key); } catch { /* Ignore unavailable recovery storage. */ }
      resetDocument(recovered ?? next.content);
      if (path.endsWith(".pani")) setMode("source");
    } catch (error) {
      setOutput((current) => [...current, `Open failed: ${error instanceof Error ? error.message : String(error)}`]);
      setBottomPanel("output"); setShowBottom(true);
    }
  }, [resetDocument]);

  const loadWorkspace = useCallback(async (root: string) => {
    try {
      const snapshot = await inspectWorkspace(root);
      setWorkspace(snapshot);
      const initial = snapshot.files.find((entry) => entry.path.endsWith("onboarding.pani")) ?? snapshot.files.find((entry) => entry.path.endsWith("welcome.pani")) ?? snapshot.files.find((entry) => entry.path.endsWith(".pani"));
      if (initial) await openFile(initial.path, snapshot);
      const [tools, status] = await Promise.all([getToolchains(), snapshot.trusted ? getGitStatus(snapshot.root).catch(() => "") : Promise.resolve("")]);
      setToolchains(tools); setGit(status);
    } catch (error) {
      setOutput([`Workspace open failed: ${error instanceof Error ? error.message : String(error)}`]); setBottomPanel("output");
    }
  }, [openFile]);

  useEffect(() => { void defaultWorkspace().then(loadWorkspace); }, [loadWorkspace]);

  const save = useCallback(async (automatic = false) => {
    if (!workspace || !file || document.source === savedSource || savingRef.current) return;
    const source = document.source;
    savingRef.current = true;
    setSaveState("saving");
    try {
      const saved = await writeWorkspaceFile(workspace.root, file.path, source, baseHash);
      setFile(saved); setBaseHash(saved.sha256); setSavedSource(saved.content);
      failedAutosaveSourceRef.current = null;
      if (sourceRef.current === saved.content) clearRecovery();
      setSaveState("saved"); setLastSavedAt(new Date());
      if (!automatic) {
        setOutput((current) => [...current, `Saved ${file.path} safely.`]);
        setNotice(`Saved ${file.path}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (automatic) failedAutosaveSourceRef.current = source;
      setSaveState("error");
      setOutput((current) => [...current, `${automatic ? "Autosave" : "Save"} failed: ${message}`]); setBottomPanel("output"); setShowBottom(true);
      setNotice(`${automatic ? "Autosave paused" : "Save failed"}: ${message}`);
    } finally {
      savingRef.current = false;
    }
  }, [baseHash, clearRecovery, document.source, file, savedSource, workspace]);

  useEffect(() => {
    try { localStorage.setItem("njc-studio:autosave-enabled", String(autosaveEnabled)); } catch { /* Preference persistence is best effort. */ }
  }, [autosaveEnabled]);

  useEffect(() => {
    if (!autosaveEnabled || !workspace?.trusted || !file || !dirty || saveState === "saving" || failedAutosaveSourceRef.current === document.source) return;
    const timer = window.setTimeout(() => void save(true), 1_200);
    return () => window.clearTimeout(timer);
  }, [autosaveEnabled, dirty, document.source, file, save, saveState, workspace?.trusted]);

  useEffect(() => {
    const flush = () => { if (window.document.visibilityState === "hidden") void save(true); };
    window.document.addEventListener("visibilitychange", flush);
    return () => window.document.removeEventListener("visibilitychange", flush);
  }, [save]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen((value) => !value); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); document.undo(); }
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "y" || event.shiftKey && event.key.toLowerCase() === "z")) { event.preventDefault(); document.redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [document, save]);

  const onFrame = useCallback((next: RenderFrame, evaluationMs: number) => {
    setFrame(next); frameCount.current += 1;
    const now = performance.now(); frameTimes.current = [...frameTimes.current.filter((time) => now - time < 1000), now];
    if (frameCount.current % 15 === 0) setPerformanceSample({
      fps: frameTimes.current.length, frameMs: frameTimes.current.length > 1 ? 1000 / frameTimes.current.length : 0,
      evaluationMs, packageBytes: compilation.result?.packageBytes.length ?? 0, compilerMs: compilation.duration, frames: frameCount.current,
    });
  }, [compilation.duration, compilation.result?.packageBytes.length]);

  const onRuntimeEvent = useCallback((event: string) => setTrace((current) => [...current, `${new Date().toLocaleTimeString()} · emitted ${event}`]), []);

  const runTask = async (id: string) => {
    if (!workspace || runningTask) return;
    setRunningTask(id); setBottomPanel("output"); setShowBottom(true);
    const task = workspace.tasks.find((item) => item.id === id);
    setOutput((current) => [...current, `> ${task?.program} ${task?.arguments.join(" ")}\n  cwd: ${task?.workingDirectory}\n  environment changes: none`]);
    try {
      const result = await executeTask(workspace.root, id);
      setOutput((current) => [...current, `${result.success ? "✓" : "✕"} ${result.taskId} (${result.durationMs} ms, exit ${result.exitCode ?? "n/a"})\n${result.output}`]);
    } catch (error) { setOutput((current) => [...current, `Task failed: ${error instanceof Error ? error.message : String(error)}`]); }
    finally { setRunningTask(null); }
  };

  const trust = useCallback(async () => {
    if (!workspace) return;
    try {
      await trustWorkspace(workspace.root);
      const refreshed = await inspectWorkspace(workspace.root); setWorkspace(refreshed);
      setGit(await getGitStatus(workspace.root).catch(() => ""));
      setNotice("Workspace trusted. Save, creation and allow-listed tasks are now available.");
    } catch (error) {
      setNotice(`Trust failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [workspace]);

  const refreshWorkspace = useCallback(async () => {
    if (!workspace) return;
    try {
      const refreshed = await inspectWorkspace(workspace.root);
      setWorkspace(refreshed);
      if (refreshed.trusted) setGit(await getGitStatus(refreshed.root).catch(() => ""));
      setNotice("Workspace refreshed.");
    } catch (error) {
      setNotice(`Refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [workspace]);

  const refreshGit = useCallback(async () => {
    if (!workspace?.trusted) return;
    try { setGit(await getGitStatus(workspace.root)); }
    catch (error) { setOutput((current) => [...current, `Git refresh failed: ${error instanceof Error ? error.message : String(error)}`]); }
  }, [workspace]);

  const createAnimation = useCallback(async (name: string, template: AnimationTemplateId) => {
    if (!workspace) return;
    if (!workspace.trusted) {
      setNotice("Trust this workspace before creating files.");
      setBottomPanel("terminal"); setShowBottom(true);
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled-animation";
    const path = `animations/${slug}.pani`;
    setCreatingAnimation(true);
    try {
      const created = await createWorkspaceFile(workspace.root, path, createAnimationSource(name, template));
      const refreshed = await inspectWorkspace(workspace.root);
      setWorkspace(refreshed); setFile(created); setBaseHash(created.sha256); setSavedSource(created.content); resetDocument(created.content);
      setMode("source"); setNewAnimationOpen(false); setOutput((current) => [...current, `Created ${path}.`]); setNotice(`Created ${path}`);
    } catch (error) {
      setNotice(`Create failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setCreatingAnimation(false); }
  }, [resetDocument, workspace]);

  const importAnimation = useCallback(async () => {
    if (!workspace) return;
    if (!workspace.trusted) {
      setNotice("Trust this workspace before importing an animation.");
      return;
    }
    try {
      const imported = await importAnimationFile(workspace.root);
      if (!imported) return;
      const refreshed = await inspectWorkspace(workspace.root);
      setWorkspace(refreshed); setFile(imported); setBaseHash(imported.sha256); setSavedSource(imported.content); resetDocument(imported.content);
      setMode("source"); setSaveState("saved"); setOutput((current) => [...current, `Imported ${imported.path}.`]); setNotice(`Imported ${imported.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOutput((current) => [...current, `Import failed: ${message}`]); setNotice(`Import failed: ${message}`);
    }
  }, [resetDocument, workspace]);

  const showExport = useCallback((kind: AnimationExportKind = "source") => {
    if (!isAnimation) { setNotice("Open or create a .pani animation before exporting."); return; }
    setInitialExportKind(kind); setExportProgress(null); setExportOpen(true);
  }, [isAnimation]);

  const handleExport = useCallback(async (kind: AnimationExportKind, timelineName: string, fps: number) => {
    if (!isAnimation) return;
    if (kind !== "source" && (!compilation.result || compilation.error || diagnostics.length)) {
      setBottomPanel("problems"); setShowBottom(true); setNotice("Resolve animation errors before exporting runtime media.");
      return;
    }
    const fileName = file?.path.split("/").at(-1) ?? "animation.pani";
    const stem = fileName.replace(/\.pani$/i, "") || "animation";
    const width = orientation === "portrait" ? device.width : device.height;
    const height = orientation === "portrait" ? device.height : device.width;
    setExporting(true);
    try {
      let result = null;
      if (kind === "source") {
        setExportProgress("Preparing editable source…");
        result = await exportAnimationSource(`${stem}.pani`, document.source);
      } else if (kind === "package" && compilation.result) {
        setExportProgress("Writing the verified runtime container…");
        result = await exportAnimationPackage(`${stem}.pani.bin`, compilation.result.packageBytes);
      } else if (kind === "mp4" && compilation.result && scene) {
        setExportProgress("Preparing runtime frames…");
        const frames = await renderAnimationVideoFrames({
          packageBytes: compilation.result.packageBytes,
          sceneName: scene.name,
          timelineName,
          width,
          height,
          fps,
          theme,
          reducedMotion,
          onProgress: (completed, total) => setExportProgress(`Rendering frame ${completed.toLocaleString()} of ${total.toLocaleString()}…`),
        });
        setExportProgress(`Encoding ${frames.length.toLocaleString()} frames as MP4…`);
        result = await exportAnimationVideo(`${stem}-${timelineName}.mp4`, frames, width, height, fps);
      }
      if (result) {
        setOutput((current) => [...current, `✓ Exported ${result.path} · ${result.size.toLocaleString()} bytes${result.encoder ? ` · ${result.encoder}` : ""}`]);
        setNotice(`Exported ${result.path}`); setExportOpen(false); setBottomPanel("output"); setShowBottom(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOutput((current) => [...current, `Export failed: ${message}`]); setNotice(`Export failed: ${message}`); setBottomPanel("output"); setShowBottom(true);
    } finally {
      setExporting(false); setExportProgress(null);
    }
  }, [compilation.error, compilation.result, device.height, device.width, diagnostics.length, document.source, file?.path, isAnimation, orientation, reducedMotion, scene, theme]);

  const buildCurrent = useCallback(() => {
    setShowBottom(true);
    if (!isAnimation) { setBottomPanel("problems"); setNotice("Open or create a .pani animation to build it."); return; }
    if (!compilation.result || compilation.error || diagnostics.length) {
      setBottomPanel("problems"); setNotice("Build paused until the animation errors are resolved."); return;
    }
    setBottomPanel("package");
    setOutput((current) => [...current, `✓ Built ${file?.path ?? "animation"} · ${compilation.result.packageBytes.length} bytes · ${compilation.duration.toFixed(2)} ms`]);
    setNotice("Verified animation package is ready for inspection.");
  }, [compilation.duration, compilation.error, compilation.result, diagnostics.length, file?.path, isAnimation]);

  const runPreview = useCallback(() => {
    if (!compilation.result || compilation.error) { setBottomPanel("problems"); setShowBottom(true); setNotice("Fix compilation errors before previewing."); return; }
    const timeline = scene?.timelines.find((item) => item.name === selectedTimeline) ?? scene?.timelines[0];
    if (!timeline) { setNotice("This scene does not have a timeline to preview."); return; }
    setSelectedTimeline(timeline.name); preview.current?.play(timeline.name);
    setTrace((current) => [...current, `Played ${timeline.name}`]); setNotice(`Previewing ${timeline.name}`);
  }, [compilation.error, compilation.result, scene?.timelines, selectedTimeline]);

  const startResize = (side: "left" | "right", event: React.PointerEvent) => {
    const origin = event.clientX; const start = side === "left" ? explorerWidth : inspectorWidth;
    const move = (next: PointerEvent) => side === "left" ? setExplorerWidth(Math.max(180, Math.min(420, start + next.clientX - origin))) : setInspectorWidth(Math.max(280, Math.min(480, start - next.clientX + origin)));
    const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end);
  };

  const setProperty = (name: string, value: string | number | boolean) => {
    if (!selectedId) return;
    try { document.setSource(updateComponentProperty(document.source, selectedId, name, value)); }
    catch (error) { setOutput((current) => [...current, `Visual edit failed: ${error instanceof Error ? error.message : String(error)}`]); }
  };

  const activeState = frame && activeMachine ? frame.activeStateMachines[activeMachine.name] : undefined;
  const activePath = file?.path ?? "animations/onboarding.pani";
  const branch = git.split("\n")[0]?.replace(/^##\s*/, "") || "source control";
  const autosaveStatus = !autosaveEnabled ? "Autosave Off" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Autosave Error" : dirty ? "Autosave Pending" : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Autosave On";
  const commands = useMemo<StudioCommand[]>(() => [
    { id: "new", label: "Animation: Create New", detail: "Create a valid .pani file from a template", shortcut: "⌘ N", run: () => setNewAnimationOpen(true) },
    { id: "workspace", label: "Workspace: Open Folder", detail: "Choose another project folder", run: () => void chooseWorkspace().then((root) => { if (root) return loadWorkspace(root); }) },
    { id: "import", label: "File: Import Animation", detail: "Copy a .pani source file into this workspace", shortcut: "⇧⌘ I", run: () => void importAnimation() },
    { id: "refresh", label: "Workspace: Refresh Explorer", run: () => void refreshWorkspace() },
    { id: "save", label: "File: Save", shortcut: "⌘ S", disabled: !dirty, run: () => void save() },
    { id: "autosave", label: `File: ${autosaveEnabled ? "Disable" : "Enable"} Autosave`, run: () => setAutosaveEnabled((value) => !value) },
    { id: "export-source", label: "Export: Editable Source (.pani)", shortcut: "⇧⌘ E", disabled: !isAnimation, run: () => showExport("source") },
    { id: "export-package", label: "Export: Runtime Package (.pani.bin)", disabled: !compilation.result, run: () => showExport("package") },
    { id: "export-mp4", label: "Export: Rendered MP4 Video", disabled: !compilation.result, run: () => showExport("mp4") },
    { id: "build", label: "Animation: Build Current", shortcut: "⇧⌘ B", disabled: !isAnimation, run: buildCurrent },
    { id: "preview", label: "Animation: Preview Timeline", shortcut: "⌘ ↵", disabled: !isAnimation, run: runPreview },
    { id: "code", label: "View: Code Editor", run: () => setMode("source") },
    { id: "visual", label: "View: Visual Editor", disabled: !isAnimation, run: () => setMode("visual") },
    { id: "state", label: "View: State Machine", disabled: !isAnimation, run: () => setMode("state") },
    { id: "feature", label: "View: Visual Feature Composer", run: () => setMode("composer") },
    { id: "package", label: "View: Animation Package", run: () => { setBottomPanel("package"); setShowBottom(true); } },
    { id: "tasks", label: "View: Workspace Tasks", run: () => { setBottomPanel("terminal"); setShowBottom(true); } },
    { id: "trust", label: "Workspace: Trust This Folder", disabled: !workspace || workspace.trusted, run: () => void trust() },
  ], [autosaveEnabled, buildCurrent, compilation.result, dirty, importAnimation, isAnimation, loadWorkspace, refreshWorkspace, runPreview, save, showExport, trust, workspace]);

  useEffect(() => {
    const handleWorkflowShortcut = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "n") { event.preventDefault(); setNewAnimationOpen(true); }
      if (command && event.key.toLowerCase() === "o") { event.preventDefault(); void chooseWorkspace().then((root) => { if (root) return loadWorkspace(root); }); }
      if (command && event.shiftKey && event.key.toLowerCase() === "i") { event.preventDefault(); void importAnimation(); }
      if (command && event.shiftKey && event.key.toLowerCase() === "e") { event.preventDefault(); showExport("source"); }
      if (command && event.shiftKey && event.key.toLowerCase() === "b") { event.preventDefault(); buildCurrent(); }
      if (command && event.key === "Enter") { event.preventDefault(); runPreview(); }
    };
    window.addEventListener("keydown", handleWorkflowShortcut);
    return () => window.removeEventListener("keydown", handleWorkflowShortcut);
  }, [buildCurrent, importAnimation, loadWorkspace, runPreview, showExport]);

  useEffect(() => {
    let disposed = false;
    let unlisten: () => void = () => undefined;
    void onStudioMenu((command) => {
      if (command === "studio.new-animation") setNewAnimationOpen(true);
      if (command === "studio.open-workspace") void chooseWorkspace().then((root) => { if (root) return loadWorkspace(root); });
      if (command === "studio.import-animation") void importAnimation();
      if (command === "studio.save") void save();
      if (command === "studio.toggle-autosave") setAutosaveEnabled((value) => !value);
      if (command === "studio.export-source") showExport("source");
      if (command === "studio.export-package") showExport("package");
      if (command === "studio.export-mp4") showExport("mp4");
    }).then((cleanup) => { if (disposed) cleanup(); else unlisten = cleanup; });
    return () => { disposed = true; unlisten(); };
  }, [importAnimation, loadWorkspace, save, showExport]);

  return (
    <div className={`studio ${theme} ${showBottom ? "" : "bottom-hidden"} ${mode === "composer" ? "composer-workbench" : ""}`} style={{ "--explorer-width": `${showExplorer ? explorerWidth : 0}px`, "--inspector-width": `${showInspector && mode !== "composer" ? inspectorWidth : 0}px` } as React.CSSProperties}>
      <header className="toolbar">
        <div className="window-mark"><span /><span /><span /></div><button className="project-switcher" onClick={async () => { const root = await chooseWorkspace(); if (root) await loadWorkspace(root); }}><i>NJ</i><span><strong>NJC Studio</strong><small>{workspace?.name ?? "Opening workspace"} · {workspace?.detections[0]?.label ?? "Detecting project"}</small></span><b>⌄</b></button>
        <div className="toolbar-center"><button onClick={buildCurrent} disabled={!isAnimation}>▣ Build</button><button className="primary" onClick={runPreview} disabled={!isAnimation}>▶ Preview</button><span className="toolbar-divider" /><select value={device.id} onChange={(event) => setDevice(devices.find((item) => item.id === event.target.value) ?? devices[0]!)}>{devices.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><button onClick={() => setOrientation((value) => value === "portrait" ? "landscape" : "portrait")} title="Rotate device">↻</button></div>
        <div className="toolbar-end"><button className="file-action" onClick={() => void save()} disabled={!dirty} title="Save current file">Save</button><button className="file-action" onClick={() => void importAnimation()} title="Import .pani animation">Import</button><button onClick={() => setReducedMotion((value) => !value)} className={reducedMotion ? "active" : ""} title="Reduced motion">◒</button><button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? "☼" : "◐"}</button><button onClick={() => setPaletteOpen(true)} title="Command palette">⌘</button><button className="publish" onClick={() => showExport("source")}>Export</button></div>
      </header>
      <div className="activity-bar"><button className={showExplorer ? "active" : ""} onClick={() => setShowExplorer((value) => !value)} title="Explorer">▱</button><button className={mode === "composer" ? "active" : ""} onClick={() => setMode("composer")} title="Visual Feature Composer">◆</button><button onClick={() => { setBottomPanel("git"); setShowBottom(true); }} title="Source control">⑂</button><button onClick={() => { setBottomPanel("devices"); setShowBottom(true); }} title="Devices">▣</button><button onClick={() => { setBottomPanel("license"); setShowBottom(true); }} title="Licensing">◇</button><span /><button onClick={() => setShowInspector((value) => !value)} title="Inspector">⚙</button></div>
      <main className="workspace-grid">
        {showExplorer && <><Explorer files={workspace?.files ?? []} activePath={activePath} onOpen={(path) => workspace && void openFile(path, workspace)} onCreate={() => setNewAnimationOpen(true)} onRefresh={() => void refreshWorkspace()} /><div className="resize-handle left" onPointerDown={(event) => startResize("left", event)} /></>}
        <section className={`editor-stack ${mode === "composer" ? "composer-active" : ""}`}>
          <div className="editor-tabs"><button className="active"><span className={mode === "composer" || isAnimation ? "pani-dot" : "file-dot"}>{mode === "composer" || isAnimation ? "◆" : "·"}</span>{mode === "composer" ? "PurchaseConfirmation.feature" : file?.path.split("/").at(-1) ?? "onboarding.pani"}{mode !== "composer" && dirty && <i>●</i>}</button><button className="add-tab" onClick={() => setNewAnimationOpen(true)} title="New animation">＋</button><div className="mode-switch"><button className={mode === "composer" ? "active" : ""} onClick={() => setMode("composer")}>Feature</button><button className={mode === "source" ? "active" : ""} onClick={() => setMode("source")}>Code</button><button disabled={!isAnimation} className={mode === "visual" ? "active" : ""} onClick={() => setMode("visual")}>Visual</button><button disabled={!isAnimation} className={mode === "state" ? "active" : ""} onClick={() => setMode("state")}>State</button></div><button onClick={document.undo} disabled={mode === "composer" || !document.canUndo} title="Undo">↶</button><button onClick={document.redo} disabled={mode === "composer" || !document.canRedo} title="Redo">↷</button><button onClick={() => void save()} disabled={mode === "composer" || !dirty} title="Save">⌘S</button></div>
          <div className="editor-main">
            {mode === "composer" && <FeatureComposer />}
            {mode === "source" && <Suspense fallback={<div className="empty-panel">Loading Monaco editor…</div>}><SourceEditor path={activePath} source={document.source} diagnostics={diagnostics} theme={theme} onChange={document.setSource} /></Suspense>}
            {mode === "visual" && <VisualCanvas frame={frame} selectedId={selectedId} onSelect={setSelectedId} />}
            {mode === "state" && <StateMachinePanel machine={activeMachine} activeState={activeState} trace={trace} onTrigger={(event) => { const accepted = activeMachine ? preview.current?.send(activeMachine.name, event) : false; setTrace((current) => [...current, `${event} · ${accepted ? "transition accepted" : "rejected from active state"}`]); }} />}
          </div>
          {isAnimation && mode !== "composer" && <TimelinePanel timelines={scene?.timelines ?? []} selected={selectedTimeline} playhead={frame?.timeMs ?? 0} onSelect={setSelectedTimeline} onPlay={(name) => preview.current?.play(name)} onSeek={(time) => preview.current?.seek(time)} onKeyframe={(target, index, field, value) => { try { document.setSource(updateKeyframe(document.source, target, index, field, value)); } catch (error) { setOutput((current) => [...current, `Timeline edit failed: ${error instanceof Error ? error.message : String(error)}`]); } }} />}
        </section>
        {showInspector && mode !== "composer" && <><div className="resize-handle right" onPointerDown={(event) => startResize("right", event)} /><div className="right-sidebar"><DevicePreview ref={preview} packageBytes={compilation.result?.packageBytes ?? null} sceneName={scene?.name ?? "Onboarding"} selectedId={selectedId} device={device} orientation={orientation} theme={theme} reducedMotion={reducedMotion} onSelect={setSelectedId} onFrame={onFrame} onEvent={onRuntimeEvent} /><Inspector component={selectedComponent} inputs={scene?.inputs ?? []} toolchains={toolchains} onProperty={setProperty} onInput={(name, value) => { try { preview.current?.setInput(name, value); } catch (error) { setOutput((current) => [...current, `Input rejected: ${error instanceof Error ? error.message : String(error)}`]); } }} /></div></>}
      </main>
      {showBottom && <BottomPanel active={bottomPanel} diagnostics={diagnostics} output={output} git={git} performance={performanceSample} packageInfo={packageInfo} detections={workspace?.detections ?? []} tasks={workspace?.tasks ?? []} toolchains={toolchains} trusted={workspace?.trusted ?? false} runningTask={runningTask} onActive={setBottomPanel} onTask={(id) => void runTask(id)} onTrust={() => void trust()} onRefreshGit={() => void refreshGit()} />}
      <footer className="status-bar"><button onClick={() => { setBottomPanel("git"); setShowBottom(true); }}>⑂ {branch}</button><button className={diagnostics.length ? "status-error" : "status-ok"} onClick={() => { setBottomPanel("problems"); setShowBottom(true); }}>{diagnostics.length ? `× ${diagnostics.length}` : "✓ 0"}</button><span>{workspace?.trusted ? "Trusted" : "Restricted"}</span><button className={saveState === "error" ? "status-error" : ""} onClick={() => setAutosaveEnabled((value) => !value)} title="Toggle disk autosave">{autosaveStatus}</button><span /><button>{mode === "composer" ? "Feature Composer" : scene?.name ?? "No scene"}</button><button>Runtime 0.1.0</button><button>{mode === "composer" || compilation.result ? "License: dev ✓" : "Not compiled"}</button><button>TS + Rust</button><button>{performanceSample.fps.toFixed(0)} FPS</button><button onClick={() => setShowBottom((value) => !value)}>⌃</button></footer>
      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
      <NewAnimationDialog open={newAnimationOpen} busy={creatingAnimation} onClose={() => setNewAnimationOpen(false)} onCreate={(name, template) => void createAnimation(name, template)} />
      <ExportDialog key={`${initialExportKind}-${exportOpen}`} open={exportOpen} busy={exporting} progress={exportProgress} initialKind={initialExportKind} timelines={scene?.timelines ?? []} selectedTimeline={selectedTimeline} width={orientation === "portrait" ? device.width : device.height} height={orientation === "portrait" ? device.height : device.width} onClose={() => !exporting && setExportOpen(false)} onExport={(kind, timeline, fps) => void handleExport(kind, timeline, fps)} />
      {!workspace?.trusted && <div className="workspace-trust-banner" role="status"><span><strong>Restricted workspace</strong> Files are readable, but creation, saves and project tasks need your approval.</span><button onClick={() => void trust()}>Trust workspace</button></div>}
      {notice && <div className="studio-notice" role="status"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button></div>}
      {mode !== "composer" && compilation.error && <div className="compile-toast" role="alert"><b>Compilation paused</b><span>{compilation.error.split("\n")[0]}</span><button onClick={() => { setBottomPanel("problems"); setShowBottom(true); }}>View problems</button></div>}
    </div>
  );
}
