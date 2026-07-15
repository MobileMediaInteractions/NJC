import { componentRegistry, type ComponentDefinition, type FeatureIR } from "@visual-feature/model";
import { ComposerPreview } from "./ComposerPreview";
import { findComponent } from "./utilities";
import type { RuntimeSnapshot } from "@visual-feature/runtime";

export function ComposerDesign({ feature, snapshot, selectedId, onSelect, onAdd, onProperty, onTrigger, onConfirm }: {
  feature: FeatureIR;
  snapshot: RuntimeSnapshot;
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (definition: ComponentDefinition) => void;
  onProperty: (name: string, value: string | number | boolean) => void;
  onTrigger: (name: string) => void;
  onConfirm: (accepted: boolean) => void;
}) {
  const selected = findComponent(feature, selectedId);
  const definitions = componentRegistry.filter((item) => ["content", "input", "media", "feedback"].includes(item.category));
  return <div className="composer-design">
    <aside className="component-library" aria-label="Component library"><div className="composer-panel-title"><span>COMPONENTS</span><small>{definitions.length} typed</small></div><input aria-label="Search components" placeholder="Search components…" />{["content", "input", "media", "feedback"].map((category) => <section key={category}><h3>{category}</h3>{definitions.filter((item) => item.category === category).map((definition) => <button key={definition.type} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("application/x-feature-component", definition.type)} onClick={() => onAdd(definition)}><i>{definition.label.slice(0, 1)}</i><span>{definition.label}<small>{definition.events.slice(0, 2).join(" · ")}</small></span><b>＋</b></button>)}</section>)}</aside>
    <section className="design-canvas" aria-label="Feature design canvas" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const type = event.dataTransfer.getData("application/x-feature-component"); const definition = componentRegistry.find((item) => item.type === type); if (definition) onAdd(definition); }}><div className="canvas-head"><span>ProductScreen</span><button type="button">390 × 844</button><button type="button">100%</button><small>Drop components or use ＋</small></div><ComposerPreview feature={feature} snapshot={snapshot} selectedId={selectedId} onSelect={onSelect} onTrigger={onTrigger} onConfirm={onConfirm} /></section>
    <aside className="composer-inspector" aria-label="Feature component inspector"><div className="composer-panel-title"><span>INSPECTOR</span><small>Schema-driven</small></div>{selected ? <><header><i>{selected.type.slice(0, 1).toUpperCase()}</i><div><strong>{selected.name}</strong><small>{selected.type} · {selected.id}</small></div></header><details open><summary>Content</summary>{Object.entries(selected.properties).map(([name, value]) => typeof value === "boolean" ? <label key={name}><span>{name}</span><input type="checkbox" checked={value} onChange={(event) => onProperty(name, event.target.checked)} /></label> : <label key={name}><span>{name}</span><input type={typeof value === "number" ? "number" : "text"} value={String(value)} onChange={(event) => onProperty(name, typeof value === "number" ? Number(event.target.value) : event.target.value)} /></label>)}</details><details open><summary>Bindings</summary>{selected.bindings.length ? selected.bindings.map((binding) => <div className="binding-chip" key={binding.id}><span>{binding.targetProperty}</span><b>←</b><code>{binding.expression}</code><small>{binding.changeAnimation ?? "immediate"}</small></div>) : <p className="composer-empty">No bindings on this component.</p>}</details><details open><summary>Accessibility</summary><label><span>Name</span><input value={selected.accessibility.name ?? ""} onChange={(event) => onProperty("$accessibleName", event.target.value)} /></label><p className="a11y-status">✓ Keyboard selection · focus visible · semantic role checked</p></details></> : <p className="composer-empty">Select a component to edit its typed properties.</p>}</aside>
  </div>;
}
