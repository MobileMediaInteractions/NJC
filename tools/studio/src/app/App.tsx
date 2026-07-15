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
import { chooseWorkspace, defaultWorkspace, executeTask, getGitStatus, getToolchains, inspectWorkspace, readWorkspaceFile, trustWorkspace, writeWorkspaceFile } from "../lib/desktop";
import { updateComponentProperty, updateKeyframe } from "../lib/structured-edits";
import type { BottomPanel as BottomPanelName, DeviceProfile, EditorMode, TextFile, ThemeMode, ToolchainDiagnostic, WorkspaceSnapshot } from "../model/protocol";
import demoSource from "../demo/onboarding.pani?raw";
import { FeatureComposer } from "../composer/FeatureComposer";

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
  const recoveryKey = `platform-studio:recovery:${workspace?.root ?? "demo"}:${file?.path ?? "onboarding.pani"}`;
  const document = useDocumentHistory(demoSource, recoveryKey);
  const [savedSource, setSavedSource] = useState(demoSource);
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
  const [showExplorer, setShowExplorer] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showBottom, setShowBottom] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(236);
  const [inspectorWidth, setInspectorWidth] = useState(332);
  const preview = useRef<PreviewHandle>(null);
  const frameTimes = useRef<number[]>([]);
  const frameCount = useRef(0);
  const [performanceSample, setPerformanceSample] = useState<PerformanceSample>({ fps: 60, frameMs: 16.7, evaluationMs: 0, packageBytes: 0, compilerMs: 0, frames: 0 });

  const isAnimation = (file?.path ?? "").endsWith(".pani");
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
  const openFile = useCallback(async (path: string, snapshot: WorkspaceSnapshot) => {
    try {
      const next = await readWorkspaceFile(snapshot.root, path);
      setFile(next); setBaseHash(next.sha256); setSavedSource(next.content);
      const key = `platform-studio:recovery:${snapshot.root}:${path}`;
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

  const save = useCallback(async () => {
    if (!workspace || !file || document.source === savedSource) return;
    try {
      const saved = await writeWorkspaceFile(workspace.root, file.path, document.source, baseHash);
      setFile(saved); setBaseHash(saved.sha256); setSavedSource(saved.content);
      try { localStorage.removeItem(recoveryKey); } catch { /* Recovery cleanup is best effort. */ }
      setOutput((current) => [...current, `Saved ${file.path} safely.`]);
    } catch (error) {
      setOutput((current) => [...current, `Save failed: ${error instanceof Error ? error.message : String(error)}`]); setBottomPanel("output"); setShowBottom(true);
    }
  }, [baseHash, document.source, file, recoveryKey, savedSource, workspace]);

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

  const trust = async () => {
    if (!workspace) return;
    await trustWorkspace(workspace.root);
    const refreshed = await inspectWorkspace(workspace.root); setWorkspace(refreshed);
    setGit(await getGitStatus(workspace.root).catch(() => ""));
  };

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
  const dirty = document.source !== savedSource;
  const activePath = file?.path ?? "animations/onboarding.pani";

  return (
    <div className={`studio ${theme} ${showBottom ? "" : "bottom-hidden"} ${mode === "composer" ? "composer-workbench" : ""}`} style={{ "--explorer-width": `${showExplorer ? explorerWidth : 0}px`, "--inspector-width": `${showInspector && mode !== "composer" ? inspectorWidth : 0}px` } as React.CSSProperties}>
      <header className="toolbar">
        <div className="window-mark"><span /><span /><span /></div><button className="project-switcher" onClick={async () => { const root = await chooseWorkspace(); if (root) await loadWorkspace(root); }}><i>PS</i><span><strong>{workspace?.name ?? "Opening workspace"}</strong><small>{workspace?.detections[0]?.label ?? "Detecting project"}</small></span><b>⌄</b></button>
        <div className="toolbar-center"><button onClick={() => void runTask("playground-build")} disabled={!workspace?.trusted || Boolean(runningTask)}>▣ Build</button><button className="primary" onClick={() => { preview.current?.play(selectedTimeline); setTrace((current) => [...current, `Played ${selectedTimeline}`]); }}>▶ Run</button><span className="toolbar-divider" /><select value={device.id} onChange={(event) => setDevice(devices.find((item) => item.id === event.target.value) ?? devices[0]!)}>{devices.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><button onClick={() => setOrientation((value) => value === "portrait" ? "landscape" : "portrait")} title="Rotate device">↻</button></div>
        <div className="toolbar-end"><button onClick={() => setReducedMotion((value) => !value)} className={reducedMotion ? "active" : ""} title="Reduced motion">◒</button><button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? "☼" : "◐"}</button><button onClick={() => setPaletteOpen(true)} title="Command palette">⌘</button><button className="publish" disabled>Publish</button></div>
      </header>
      <div className="activity-bar"><button className={showExplorer ? "active" : ""} onClick={() => setShowExplorer((value) => !value)} title="Explorer">▱</button><button className={mode === "composer" ? "active" : ""} onClick={() => setMode("composer")} title="Visual Feature Composer">◆</button><button onClick={() => { setBottomPanel("git"); setShowBottom(true); }} title="Source control">⑂</button><button onClick={() => { setBottomPanel("devices"); setShowBottom(true); }} title="Devices">▣</button><button onClick={() => { setBottomPanel("license"); setShowBottom(true); }} title="Licensing">◇</button><span /><button onClick={() => setShowInspector((value) => !value)} title="Inspector">⚙</button></div>
      <main className="workspace-grid">
        {showExplorer && <><Explorer files={workspace?.files ?? []} activePath={activePath} onOpen={(path) => workspace && void openFile(path, workspace)} /><div className="resize-handle left" onPointerDown={(event) => startResize("left", event)} /></>}
        <section className={`editor-stack ${mode === "composer" ? "composer-active" : ""}`}>
          <div className="editor-tabs"><button className="active"><span className={mode === "composer" || isAnimation ? "pani-dot" : "file-dot"}>{mode === "composer" || isAnimation ? "◆" : "·"}</span>{mode === "composer" ? "PurchaseConfirmation.feature" : file?.path.split("/").at(-1) ?? "onboarding.pani"}{mode !== "composer" && dirty && <i>●</i>}<b>×</b></button><button className="add-tab">＋</button><div className="mode-switch"><button className={mode === "composer" ? "active" : ""} onClick={() => setMode("composer")}>Feature</button><button className={mode === "source" ? "active" : ""} onClick={() => setMode("source")}>Code</button><button disabled={!isAnimation} className={mode === "visual" ? "active" : ""} onClick={() => setMode("visual")}>Visual</button><button disabled={!isAnimation} className={mode === "state" ? "active" : ""} onClick={() => setMode("state")}>State</button></div><button onClick={document.undo} disabled={mode === "composer" || !document.canUndo} title="Undo">↶</button><button onClick={document.redo} disabled={mode === "composer" || !document.canRedo} title="Redo">↷</button><button onClick={() => void save()} disabled={mode === "composer" || !dirty} title="Save">⌘S</button></div>
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
      {showBottom && <BottomPanel active={bottomPanel} diagnostics={diagnostics} output={output} git={git} performance={performanceSample} packageInfo={packageInfo} detections={workspace?.detections ?? []} tasks={workspace?.tasks ?? []} toolchains={toolchains} trusted={workspace?.trusted ?? false} onActive={setBottomPanel} onTask={(id) => void runTask(id)} onTrust={() => void trust()} />}
      <footer className="status-bar"><button>⑂ main*</button><span className={diagnostics.length ? "status-error" : "status-ok"}>{diagnostics.length ? `× ${diagnostics.length}` : "✓ 0"}</span><span>{workspace?.trusted ? "Trusted" : "Restricted"}</span><span /><button>{mode === "composer" ? "Feature Composer" : scene?.name ?? "No scene"}</button><button>Runtime 0.1.0</button><button>{mode === "composer" || compilation.result ? "License: dev ✓" : "Not compiled"}</button><button>DOM hybrid</button><button>{performanceSample.fps.toFixed(0)} FPS</button><button onClick={() => setShowBottom((value) => !value)}>⌃</button></footer>
      {paletteOpen && <div className="palette-backdrop" onMouseDown={() => setPaletteOpen(false)}><div className="command-palette" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette"><input autoFocus placeholder="Type a command or file name…" /><div><button onClick={() => { setMode("source"); setPaletteOpen(false); }}><span>›</span>Open source editor<kbd>⌘ 1</kbd></button><button onClick={() => { setMode("visual"); setPaletteOpen(false); }}><span>›</span>Open visual editor<kbd>⌘ 2</kbd></button><button onClick={() => { setMode("state"); setPaletteOpen(false); }}><span>›</span>Open state machine<kbd>⌘ 3</kbd></button><button onClick={() => { void save(); setPaletteOpen(false); }}><span>›</span>Save current file<kbd>⌘ S</kbd></button><button onClick={() => { setBottomPanel("devices"); setShowBottom(true); setPaletteOpen(false); }}><span>›</span>Show toolchain diagnostics</button></div><small>Commands are keyboard accessible. Project tasks still require workspace trust.</small></div></div>}
      {mode !== "composer" && compilation.error && <div className="compile-toast" role="alert"><b>Compilation paused</b><span>{compilation.error.split("\n")[0]}</span><button onClick={() => { setBottomPanel("problems"); setShowBottom(true); }}>View problems</button></div>}
    </div>
  );
}
