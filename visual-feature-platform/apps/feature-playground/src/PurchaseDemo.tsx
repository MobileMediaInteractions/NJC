import { useMemo, useState } from "react";
import { compileFeature } from "@visual-feature/compiler";
import { createPurchaseFeature } from "@visual-feature/model/examples";
import { createMockHost, FeatureRuntime, type RuntimeSnapshot } from "@visual-feature/runtime";

export function PurchaseDemo() {
  const feature = useMemo(createPurchaseFeature, []);
  const compiled = useMemo(() => compileFeature(feature), [feature]);
  const [outcome, setOutcome] = useState<"success" | "failure">("success");
  const runtime = useMemo(() => new FeatureRuntime(compiled.packageBytes, createMockHost(feature, outcome)), [compiled.packageBytes, feature, outcome]);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>(() => runtime.snapshot());
  const reset = (next: "success" | "failure") => { setOutcome(next); setSnapshot(new FeatureRuntime(compiled.packageBytes, createMockHost(feature, next)).snapshot()); };
  const start = async () => setSnapshot(await runtime.dispatch("BuyButton", "tapped"));
  const confirm = async (accepted: boolean) => setSnapshot(await runtime.confirm(accepted));
  return (
    <section className="demo-grid" aria-label="Purchase feature preview">
      <div className="phone">
        <div className="product-art" aria-label="Abstract headphones product image"><span>◖</span><span>◗</span></div>
        <p className="eyebrow">FEATURE PLAYGROUND</p><h2>Studio Headphones</h2><p className="price">$129.00</p>
        <button className="purchase" onClick={() => void start()}>Purchase</button>
        {snapshot.state.PurchaseStatus === "purchasing" && <p className="state loading">Processing development purchase…</p>}
        {snapshot.visible["component.purchase-success"] && <p className="state success">✓ Purchase complete</p>}
        {snapshot.visible["component.purchase-error"] && <p className="state error">Purchase failed in the selected simulation.</p>}
        {snapshot.pendingConfirmation && <div className="modal" role="dialog" aria-modal="true" aria-label={snapshot.pendingConfirmation.title}><strong>{snapshot.pendingConfirmation.title}</strong><p>{snapshot.pendingConfirmation.message}</p><div><button onClick={() => void confirm(false)}>{snapshot.pendingConfirmation.cancel}</button><button onClick={() => void confirm(true)}>{snapshot.pendingConfirmation.confirm}</button></div></div>}
      </div>
      <aside className="inspector"><p className="eyebrow">VERIFIED PACKAGE</p><h2>{feature.name}</h2><dl><div><dt>Package</dt><dd>{(compiled.packageBytes.length / 1024).toFixed(1)} KiB</dd></div><div><dt>Entitlement</dt><dd>{feature.entitlement}</dd></div><div><dt>Compiler</dt><dd>{compiled.compiled.compilerVersion}</dd></div><div><dt>Diagnostics</dt><dd>{compiled.diagnostics.length}</dd></div></dl><h3>Simulation</h3><div className="segmented"><button className={outcome === "success" ? "active" : ""} onClick={() => reset("success")}>Success</button><button className={outcome === "failure" ? "active" : ""} onClick={() => reset("failure")}>Failure</button></div><h3>Runtime trace</h3><ol>{snapshot.trace.slice(-8).map((item) => <li key={item.sequence}><span>{item.kind}</span>{item.label}</li>)}</ol></aside>
    </section>
  );
}
