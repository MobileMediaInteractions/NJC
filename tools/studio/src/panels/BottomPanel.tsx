import type { Diagnostic } from "@platform/runtime/animation";
import type { BottomPanel as PanelName, Detection, ImportConsoleLine, TaskDefinition, ToolchainDiagnostic } from "../model/protocol";
import { ImportConsole } from "../components/ImportConsole";

const panelNames: { id: PanelName; label: string }[] = [
  { id: "problems", label: "Problems" }, { id: "output", label: "Output" }, { id: "import", label: "Import Console" }, { id: "terminal", label: "Terminal" },
  { id: "performance", label: "Performance" }, { id: "git", label: "Source Control" }, { id: "package", label: "Package" },
  { id: "license", label: "License Lab" }, { id: "devices", label: "Devices" },
];

export type PerformanceSample = { fps: number; frameMs: number; evaluationMs: number; packageBytes: number; compilerMs: number; frames: number };
export type PackageInfo = { minimumRuntime: string; compilerVersion: string; sourceHash: string; features: string[]; scenes: number; timelines: number; machines: number; packageBytes: number } | null;

export function BottomPanel({ active, diagnostics, output, importLines, importRunning, git, performance, packageInfo, detections, tasks, toolchains, trusted, runningTask, onActive, onTask, onTrust, onRefreshGit, onClearImport }: {
  active: PanelName;
  diagnostics: Diagnostic[];
  output: string[];
  importLines: ImportConsoleLine[];
  importRunning: boolean;
  git: string;
  performance: PerformanceSample;
  packageInfo: PackageInfo;
  detections: Detection[];
  tasks: TaskDefinition[];
  toolchains: ToolchainDiagnostic[];
  trusted: boolean;
  runningTask: string | null;
  onActive: (name: PanelName) => void;
  onTask: (id: string) => void;
  onTrust: () => void;
  onRefreshGit: () => void;
  onClearImport: () => void;
}) {
  return (
    <section className="bottom-panel" aria-label="Development tools">
      <div className="bottom-tabs" role="tablist">
        {panelNames.map((panel) => <button role="tab" aria-selected={active === panel.id} className={active === panel.id ? "active" : ""} key={panel.id} onClick={() => onActive(panel.id)}>{panel.label}{panel.id === "problems" && diagnostics.length > 0 ? <b>{diagnostics.length}</b> : null}</button>)}
      </div>
      <div className="bottom-content">
        {active === "problems" && <div className="problems-list">{diagnostics.length === 0 ? <div className="empty-row"><i className="ok-ring">✓</i> No compiler or semantic problems</div> : diagnostics.map((item, index) => <button key={`${item.code}-${index}`}><i className={item.severity} /> <span><b>{item.code}</b>{item.message}</span><small>Ln {item.span.start.line}, Col {item.span.start.column}</small></button>)}</div>}
        {active === "output" && <pre className="output-log">{output.join("\n\n") || "Compile and task output will appear here."}</pre>}
        {active === "import" && <ImportConsole lines={importLines} running={importRunning} onClear={onClearImport} />}
        {active === "terminal" && <div className="task-terminal"><div className="trust-banner"><div><strong>{trusted ? "Trusted workspace" : "Restricted mode"}</strong><span>{trusted ? "Allow-listed project adapters may execute." : "Inspecting is safe; trust is required before any project command runs."}</span></div>{!trusted && <button onClick={onTrust}>Review & trust</button>}</div><div className="task-grid">{tasks.map((task) => <button key={task.id} onClick={() => onTask(task.id)} disabled={!trusted || Boolean(runningTask)}><span className={`task-kind ${task.kind}`}>{task.kind}</span><strong>{runningTask === task.id ? "Running…" : task.label}</strong><code>{task.program} {task.arguments.join(" ")}</code></button>)}</div></div>}
        {active === "performance" && <div className="metric-grid">{[
          ["FPS", performance.fps.toFixed(0), "Target 60"], ["Frame", `${performance.frameMs.toFixed(2)} ms`, "UI interval"], ["Evaluation", `${performance.evaluationMs.toFixed(3)} ms`, "Runtime"], ["Compiler", `${performance.compilerMs.toFixed(2)} ms`, "Latest build"], ["Package", `${(performance.packageBytes / 1024).toFixed(1)} KB`, "Verified bytes"], ["Frames", String(performance.frames), "This session"],
        ].map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small><i style={{ width: `${Math.min(100, Number.parseFloat(value) * (label === "FPS" ? 1.5 : 4))}%` }} /></div>)}</div>}
        {active === "git" && <div className="git-panel"><div className="git-actions"><button onClick={onRefreshGit} disabled={!trusted}>↻ Refresh</button><span>Read-only source control status. Commit operations stay in your Git client.</span></div><pre>{git || "Trust the workspace to inspect Git status."}</pre></div>}
        {active === "package" && <div className="package-inspector">{packageInfo ? <><div className="package-hero"><span>PANI</span><div><strong>Verified animation package</strong><small>FlatBuffers container · SHA-256 integrity</small></div><b>{(packageInfo.packageBytes / 1024).toFixed(2)} KB</b></div><dl><div><dt>Minimum runtime</dt><dd>{packageInfo.minimumRuntime}</dd></div><div><dt>Compiler</dt><dd>{packageInfo.compilerVersion}</dd></div><div><dt>Scenes</dt><dd>{packageInfo.scenes}</dd></div><div><dt>Timelines</dt><dd>{packageInfo.timelines}</dd></div><div><dt>State machines</dt><dd>{packageInfo.machines}</dd></div><div><dt>Required capabilities</dt><dd>{packageInfo.features.join(", ")}</dd></div><div className="wide"><dt>Canonical source hash</dt><dd><code>{packageInfo.sourceHash}</code></dd></div></dl></> : <div className="empty-row">Compile valid animation source to inspect its package.</div>}</div>}
        {active === "license" && <div className="license-lab"><div className="license-card valid"><span>DEVELOPMENT ENTITLEMENT</span><strong>studio.demo</strong><small>Exact application: com.mobilemediainteractions.njc.studio</small><div><i /> Reference receipt profile <b>Ed25519</b></div><button onClick={() => onTask("platform-demo")} disabled={!trusted}>Run signed entitlement test</button></div><div className="simulation-list"><strong>Simulation scenarios</strong>{["Valid entitlement", "Expired lease", "Revoked license", "Offline grace", "Wrong application identity", "Server unavailable"].map((scenario, index) => <label key={scenario}><input type="radio" name="license-scenario" defaultChecked={index === 0} /> <span>{scenario}</span><small>{index === 0 ? "Adapter test" : "Preview only"}</small></label>)}<p>The adapter test invokes the repository's real development fixture after workspace trust. Private signing keys are never loaded into this frontend. Persistent administrative operations use the capability-protected licensing API.</p></div></div>}
        {active === "devices" && <div className="devices-panel"><div className="detected-projects"><strong>Detected project adapters</strong>{detections.map((item) => <div key={item.id}><span>{item.label}</span><b>{Math.round(item.confidence * 100)}%</b><small>{item.evidence.join(" · ")}</small></div>)}</div><div className="toolchains"><strong>Host toolchains</strong>{toolchains.map((tool) => <div key={tool.id} className={tool.available ? "available" : "unavailable"}><i>{tool.available ? "✓" : "!"}</i><span>{tool.label}<small>{tool.summary}</small>{tool.remediation && <em>{tool.remediation}</em>}</span></div>)}</div></div>}
      </div>
    </section>
  );
}
