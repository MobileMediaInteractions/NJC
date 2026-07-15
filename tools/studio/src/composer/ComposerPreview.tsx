import type { CSSProperties, ReactNode } from "react";
import type { FeatureComponent, FeatureIR, JsonValue } from "@visual-feature/model";
import { resolveBindings, type RuntimeSnapshot } from "@visual-feature/runtime";

export function ComposerPreview({ feature, snapshot, selectedId, onSelect, onTrigger, onConfirm }: {
  feature: FeatureIR;
  snapshot: RuntimeSnapshot;
  selectedId: string;
  onSelect: (id: string) => void;
  onTrigger: (name: string) => void;
  onConfirm: (accepted: boolean) => void;
}) {
  const bound = resolveBindings(feature, snapshot.state);
  const resolved = (component: FeatureComponent, property: string, fallback: JsonValue) => bound[`${component.id}.${property}`] ?? component.properties[property] ?? fallback;
  const renderNode = (component: FeatureComponent): ReactNode => {
    if (component.hidden || snapshot.visible[component.id] === false) return null;
    const selected = selectedId === component.id ? " selected" : "";
    const baseProps = { "data-component-id": component.id, className: `composer-node ${component.type}${selected}`, onClick: (event: React.MouseEvent) => { event.stopPropagation(); onSelect(component.id); } };
    if (component.type === "stack" || component.type === "row") {
      const style = { "--component-gap": `${component.layout.gap ?? 12}px`, "--component-padding": `${component.layout.padding ?? 0}px` } as CSSProperties;
      return <section key={component.id} data-component-id={component.id} className={`composer-node ${component.type}${selected}`} style={style} aria-label={component.name}>{component.children.map(renderNode)}</section>;
    }
    if (component.type === "image") return <button key={component.id} type="button" {...baseProps} aria-label={`${component.name}: ${String(resolved(component, "source", "image"))}`}><span className="product-shape"><i /><i /></span><small>BOUND IMAGE</small></button>;
    if (component.type === "heading") return <button key={component.id} type="button" {...baseProps}>{String(resolved(component, "text", "Heading"))}</button>;
    if (component.type === "text") return <button key={component.id} type="button" {...baseProps}>{String(resolved(component, "text", "Text"))}</button>;
    if (component.type === "button") return <button key={component.id} type="button" {...baseProps} onDoubleClick={() => onTrigger(component.name)}>{String(resolved(component, "label", "Button"))}</button>;
    if (component.type === "spinner") return <button key={component.id} type="button" {...baseProps}><i className="spinner-ring" /> Processing…</button>;
    if (component.type === "card") return <button key={component.id} type="button" {...baseProps}>{component.name.includes("Success") ? "✓ " : "! "}{String(resolved(component, "title", component.name))}</button>;
    if (component.type === "modal") return null;
    return <button key={component.id} type="button" {...baseProps}>{component.name}</button>;
  };
  const modal = snapshot.pendingConfirmation;
  return <div className="composer-device-stage"><div className="composer-device"><div className="composer-system"><span>9:41</span><span>●●●</span></div>{feature.screens[0] ? renderNode(feature.screens[0].root) : null}{modal && <div className="composer-modal" role="dialog" aria-modal="true" aria-label={modal.title}><span>CONFIRMATION</span><strong>{modal.title}</strong><p>{modal.message}</p><div><button type="button" onClick={() => onConfirm(false)}>{modal.cancel}</button><button type="button" onClick={() => onConfirm(true)}>{modal.confirm}</button></div></div>}</div></div>;
}
