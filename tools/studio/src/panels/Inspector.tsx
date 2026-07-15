import type { ComponentNode, InputNode, ScalarValue } from "@platform/runtime/animation";
import type { ToolchainDiagnostic } from "../model/protocol";

function scalarValue(value: ScalarValue) { return value.value; }

export function Inspector({ component, inputs, toolchains, onProperty, onInput }: {
  component?: ComponentNode;
  inputs: InputNode[];
  toolchains: ToolchainDiagnostic[];
  onProperty: (name: string, value: string | number | boolean) => void;
  onInput: (name: string, value: string | number | boolean) => void;
}) {
  return (
    <aside className="inspector" aria-label="Property inspector">
      <div className="panel-heading"><span>INSPECTOR</span><button title="Panel menu">•••</button></div>
      {component ? (
        <>
          <div className="selection-title"><span className={`kind-icon ${component.kind}`}>{component.kind.slice(0, 1).toUpperCase()}</span><div><strong>{component.id}</strong><small>{component.kind} component</small></div></div>
          <details open><summary>Transform</summary><div className="property-grid">
            {Object.entries(component.properties).filter(([name]) => ["x", "y", "width", "height", "scale", "rotation", "opacity", "cornerRadius"].includes(name)).map(([name, value]) => (
              <label key={name}><span>{name}</span><input type="number" step={name === "opacity" || name === "scale" ? 0.01 : 1} value={Number(scalarValue(value))} onChange={(event) => onProperty(name, Number(event.target.value))} /><button title={`Keyframe ${name}`}>◇</button></label>
            ))}
          </div></details>
          <details open><summary>Appearance & content</summary><div className="property-grid full">
            {Object.entries(component.properties).filter(([name]) => !["x", "y", "width", "height", "scale", "rotation", "opacity", "cornerRadius", "hostId"].includes(name)).map(([name, value]) => {
              const current = scalarValue(value);
              const color = typeof current === "string" && /^#[0-9a-f]{3,8}$/i.test(current);
              return <label key={name}><span>{name}</span>{color && <input className="color-input" type="color" value={current.slice(0, 7)} onChange={(event) => onProperty(name, event.target.value)} />}<input value={String(current)} onChange={(event) => onProperty(name, event.target.value)} /><button title={`Reveal ${name} in source`}>⌁</button></label>;
            })}
          </div></details>
        </>
      ) : <div className="empty-selection"><span>◇</span><p>Select an object in the preview or layer list.</p></div>}
      <details open><summary>Runtime inputs</summary><div className="property-grid full">
        {inputs.map((input) => {
          const initial = scalarValue(input.defaultValue);
          return <label key={input.name}><span>{input.name}<small>{input.type}</small></span><input type={typeof initial === "number" ? "number" : "text"} defaultValue={String(initial)} onChange={(event) => onInput(input.name, typeof initial === "number" ? Number(event.target.value) : event.target.value)} /></label>;
        })}
      </div></details>
      <details><summary>Environment</summary><div className="toolchain-mini">
        {toolchains.map((tool) => <div key={tool.id}><i className={tool.available ? "ok" : "missing"} /><span>{tool.label}</span><small>{tool.available ? "Ready" : "Setup"}</small></div>)}
      </div></details>
    </aside>
  );
}
