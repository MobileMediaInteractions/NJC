import type { RenderFrame } from "@platform/runtime/animation";

export function VisualCanvas({ frame, selectedId, onSelect }: { frame: RenderFrame | null; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="visual-workspace">
      <div className="canvas-toolbar"><button>↖ Select</button><button>▭ Frame</button><button>T Text</button><button>◇ Path</button><span /><button>−</button><b>76%</b><button>＋</button><button>⌗ Grid</button><button>⊙ Snap</button></div>
      <div className="ruler horizontal">{[0, 100, 200, 300, 400].map((value) => <span key={value}>{value}</span>)}</div>
      <div className="ruler vertical">{[0, 200, 400, 600, 800].map((value) => <span key={value}>{value}</span>)}</div>
      <div className="artboard-label">Onboarding · 390 × 844</div>
      <div className="canvas-pan">
        <div className="artboard" style={{ transform: "scale(.72)", transformOrigin: "top left" }}>
          {frame?.nodes.map((node) => {
            const props = node.properties;
            const style: React.CSSProperties = {
              position: "absolute", left: Number(props.x ?? 0), top: Number(props.y ?? 0),
              width: Number(props.width ?? (node.kind === "text" ? 330 : 80)), height: node.kind === "text" ? "auto" : Number(props.height ?? 80),
              opacity: Number(props.opacity ?? 1), transform: `scale(${Number(props.scale ?? 1)})`, borderRadius: Number(props.cornerRadius ?? 0),
              color: String(props.color ?? "#17231f"), background: node.kind === "rect" || node.kind === "host" ? String(props.fill ?? (node.kind === "host" ? "#173e32" : "transparent")) : undefined,
            };
            return <button key={node.id} className={`canvas-node ${node.kind} ${selectedId === node.id ? "selected" : ""}`} style={style} onClick={() => onSelect(node.id)} aria-label={`Select ${node.id} on visual canvas`}>
              {node.kind === "text" ? String(props.text ?? node.id) : node.kind === "host" ? "Continue →" : node.kind === "path" ? <svg viewBox="0 0 320 140"><path d={String(props.path ?? "")} fill="none" stroke={String(props.fill ?? "#2d6a55")} strokeWidth="5" /></svg> : null}
              {selectedId === node.id && <><i className="handle nw" /><i className="handle ne" /><i className="handle sw" /><i className="handle se" /><span className="node-tag">{node.id}</span></>}
            </button>;
          })}
          <div className="canvas-safe top" /><div className="canvas-safe bottom" />
        </div>
      </div>
      <div className="layers-float"><strong>LAYERS</strong>{frame?.nodes.map((node) => <button className={selectedId === node.id ? "active" : ""} key={node.id} onClick={() => onSelect(node.id)}><span>{node.kind === "text" ? "T" : node.kind === "host" ? "H" : "◇"}</span>{node.id}<small>◉</small></button>)}</div>
    </div>
  );
}
