import type { RuntimeSnapshot } from "@visual-feature/runtime";
import type { FeatureIR } from "@visual-feature/model";

export function ComposerTest({ feature, snapshot, outcome, reducedMotion, packageBytes, testResult, onOutcome, onReducedMotion, onStart, onConfirm, onRunTest, onReset }: {
  feature: FeatureIR;
  snapshot: RuntimeSnapshot;
  outcome: "success" | "failure";
  reducedMotion: boolean;
  packageBytes: number;
  testResult?: { passed: boolean; failures: string[] };
  onOutcome: (value: "success" | "failure") => void;
  onReducedMotion: (value: boolean) => void;
  onStart: () => void;
  onConfirm: (accepted: boolean) => void;
  onRunTest: () => void;
  onReset: () => void;
}) {
  return <div className="composer-test">
    <aside className="test-scenarios"><div className="composer-panel-title"><span>TEST SCENARIO</span><small>Deterministic</small></div><label><span>Purchase service</span><select value={outcome} onChange={(event) => onOutcome(event.target.value as "success" | "failure")}><option value="success">Return success</option><option value="failure">Return typed failure</option></select></label><label className="check-row"><input type="checkbox" checked={reducedMotion} onChange={(event) => onReducedMotion(event.target.checked)} /><span>Reduced motion</span></label><div className="test-actions"><button type="button" onClick={onStart}>1. Tap BuyButton</button><button type="button" onClick={() => onConfirm(true)} disabled={!snapshot.pendingConfirmation}>2. Confirm purchase</button><button type="button" onClick={onReset}>Reset runtime</button></div><button className="run-automated" type="button" onClick={onRunTest}>▶ Run recorded interaction test</button>{testResult && <p className={testResult.passed ? "test-pass" : "test-fail"}>{testResult.passed ? "✓ All guided assertions passed" : `✕ ${testResult.failures.join(" ")}`}</p>}</aside>
    <section className="trace-view"><div className="graph-head"><span>EVENT & BEHAVIOR TRACE</span><small>{snapshot.trace.length} bounded events</small><button type="button">Export sanitized</button></div><table><thead><tr><th>#</th><th>Time</th><th>Kind</th><th>Event</th><th>Object</th></tr></thead><tbody>{snapshot.trace.map((item) => <tr key={item.sequence}><td>{item.sequence}</td><td>{item.timeMs}ms</td><td><span className={`trace-kind ${item.kind}`}>{item.kind}</span></td><td>{item.label}</td><td><code>{item.objectId ?? "—"}</code></td></tr>)}</tbody></table></section>
    <aside className="test-inspectors"><div className="composer-panel-title"><span>INSPECTORS</span><small>Live</small></div><section><h3>State</h3>{Object.entries(snapshot.state).map(([name, value]) => <div key={name}><span>{name}</span><code>{typeof value === "object" ? JSON.stringify(value) : String(value)}</code></div>)}</section><section><h3>Package</h3><div><span>Verified bytes</span><code>{packageBytes.toLocaleString()}</code></div><div><span>Entitlement</span><code>{feature.entitlement}</code></div><div><span>Animations</span><code>{snapshot.activeAnimations.join(", ") || "idle"}</code></div></section></aside>
  </div>;
}
