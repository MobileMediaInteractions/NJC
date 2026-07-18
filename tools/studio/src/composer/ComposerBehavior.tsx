import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { behaviorSuggestions, componentDefinition, type BehaviorFlow, type FeatureComponent } from "@visual-feature/model";

type NodePosition = { x: number; y: number };

export function ComposerBehavior({ selected, flow, source, onAddAction, onMoveNode, onAutoArrange, arranging, layoutStatus }: {
  selected?: FeatureComponent;
  flow?: BehaviorFlow;
  source: string;
  onAddAction: (action: string) => void;
  onMoveNode: (nodeId: string, position: NodePosition) => void;
  onAutoArrange: () => Promise<void>;
  arranging: boolean;
  layoutStatus?: string;
}) {
  const definition = selected ? componentDefinition(selected.type) : undefined;
  const suggestions = selected ? behaviorSuggestions(selected.type) : [];
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [draftPositions, setDraftPositions] = useState<Record<string, NodePosition>>({});
  const graphRef = useRef<HTMLDivElement>(null);
  const dragCleanup = useRef<(() => void) | undefined>(undefined);
  const storedPositions = useMemo(() => new Map(flow?.nodes.map((node) => [node.id, node.position]) ?? []), [flow]);
  const selectedNode = flow?.nodes.find((node) => node.id === selectedNodeId) ?? flow?.nodes[0];
  const positionFor = (nodeId: string) => draftPositions[nodeId] ?? storedPositions.get(nodeId) ?? { x: 0, y: 0 };
  const canvasWidth = Math.max(780, ...(flow?.nodes.map((node) => positionFor(node.id).x + 500) ?? [780]));
  const canvasHeight = Math.max(1_020, ...(flow?.nodes.map((node) => positionFor(node.id).y + 160) ?? [1_020]));

  useEffect(() => () => dragCleanup.current?.(), []);

  const startDrag = (nodeId: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const origin = { x: event.clientX, y: event.clientY };
    const start = positionFor(nodeId);
    let latest = start;
    setSelectedNodeId(nodeId);
    const move = (next: globalThis.PointerEvent) => {
      latest = { x: Math.max(-210, start.x + next.clientX - origin.x), y: Math.max(20, start.y + next.clientY - origin.y) };
      setDraftPositions((current) => ({ ...current, [nodeId]: latest }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      onMoveNode(nodeId, latest);
      setDraftPositions((current) => { const next = { ...current }; delete next[nodeId]; return next; });
      dragCleanup.current = undefined;
    };
    dragCleanup.current?.();
    dragCleanup.current = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const nudgeNode = (nodeId: string, event: KeyboardEvent<HTMLButtonElement>) => {
    if (!event.altKey || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const position = positionFor(nodeId);
    const step = event.shiftKey ? 20 : 5;
    onMoveNode(nodeId, {
      x: position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      y: position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
    });
  };

  return <div className="composer-behavior">
    <aside className="guided-builder"><div className="composer-panel-title"><span>BLUEPRINT PALETTE</span><small>Schema-aware</small></div>{selected && definition ? <><header><i>{selected.type.slice(0, 1).toUpperCase()}</i><div><strong>{selected.name}</strong><small>{definition.label}</small></div></header><label><span>Event</span><select aria-label="Blueprint trigger" defaultValue={flow?.trigger.event ?? definition.events[0]}>{definition.events.map((eventName) => <option key={eventName}>{eventName}</option>)}</select></label><h3>Compatible nodes</h3><div className="suggestion-grid">{suggestions.map((action) => <button type="button" key={action} onClick={() => onAddAction(action)}><span>＋</span>{action}</button>)}</div><p className="schema-note">Only nodes compatible with this component, its capabilities and typed ports are offered. Every change updates the same canonical Feature IR used by readable source.</p></> : <p className="composer-empty">Select a component in Design before attaching a Blueprint.</p>}</aside>
    <section className="behavior-graph" aria-label="NJC Blueprint graph" aria-busy={arranging}><div className="graph-head"><span>NJC BLUEPRINT</span><small>{layoutStatus ?? (flow ? `${flow.nodes.length} nodes · ${flow.edges.length} typed wires` : "No attached Blueprint")}</small><button type="button" onClick={() => graphRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" })}>Reset view</button><button type="button" className="native-layout" disabled={!flow || arranging} onClick={() => void onAutoArrange()}>{arranging ? "Arranging…" : "Auto arrange"}</button></div>{flow ? <div className="graph-scroll" ref={graphRef}><div className="graph-canvas-spacer" style={{ width: canvasWidth, height: canvasHeight }} aria-hidden="true" /><svg aria-hidden="true" width={canvasWidth} height={canvasHeight} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="none">{flow.edges.map((edge) => { const from = positionFor(edge.fromNodeId); const to = positionFor(edge.toNodeId); return <path key={edge.id} d={`M ${from.x + 420} ${from.y + 48} C ${from.x + 470} ${from.y + 80}, ${to.x + 180} ${to.y - 28}, ${to.x + 230} ${to.y}`} data-outcome={edge.outcome ?? "next"} />; })}</svg>{flow.nodes.map((node) => { const position = positionFor(node.id); return <button type="button" className={`graph-node ${node.kind} ${selectedNode?.id === node.id ? "selected" : ""}`} style={{ left: position.x + 230, top: position.y }} key={node.id} onClick={() => setSelectedNodeId(node.id)} onPointerDown={(event) => startDrag(node.id, event)} onKeyDown={(event) => nudgeNode(node.id, event)} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight" aria-label={`${node.label} Blueprint node`}><span>{node.kind.replace("-", " ")}</span><strong>{node.label}</strong><small>{node.inputs.map((port) => port.valueType).join(", ") || "event"} → {node.outputs.map((port) => port.label).join(" · ") || "end"}</small><div className="node-ports" aria-hidden="true"><i className="input-port" />{node.outputs.map((port) => <i className={`output-port ${port.valueType}`} key={port.id} />)}</div></button>; })}</div> : <div className="composer-empty">Choose an event and compatible node to create a typed Blueprint.</div>}</section>
    <aside className="english-preview"><div className="composer-panel-title"><span>NODE + SOURCE</span><small>Synchronized</small></div><div className="blueprint-inspector">{selectedNode ? <section><span className="node-kind">{selectedNode.kind.replace("-", " ")}</span><strong>{selectedNode.label}</strong><small>{selectedNode.id}</small><dl>{Object.entries(selectedNode.config).map(([key, value]) => <div key={key}><dt>{key}</dt><dd><code>{typeof value === "string" ? value : JSON.stringify(value)}</code></dd></div>)}</dl><h3>Typed ports</h3>{[...selectedNode.inputs, ...selectedNode.outputs].map((port) => <p key={`${port.id}-${port.label}`}><i className={port.valueType} />{port.label}<code>{port.valueType}</code></p>)}</section> : <p className="composer-empty">Select a node to inspect its typed configuration.</p>}<h3>Readable equivalent</h3><pre>{source}</pre></div><footer><i /> One IR · English or Blueprint authoring</footer></aside>
  </div>;
}
