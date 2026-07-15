import type { MachineNode } from "@platform/runtime/animation";

export function StateMachinePanel({ machine, activeState, trace, onTrigger }: { machine?: MachineNode; activeState?: string; trace: string[]; onTrigger: (event: string) => void }) {
  if (!machine) return <div className="empty-panel">No state machine in this scene.</div>;
  const positions = machine.states.map((state, index) => ({ state, x: 70 + (index % 2) * 250, y: 70 + Math.floor(index / 2) * 155 }));
  return (
    <div className="state-editor">
      <div className="graph-canvas" role="img" aria-label={`State machine ${machine.name}. Active state: ${activeState ?? machine.initialState}`}>
        <svg className="graph-lines" aria-hidden="true">
          {machine.transitions.map((transition, index) => {
            const from = positions.find((item) => item.state === transition.from)!;
            const to = positions.find((item) => item.state === transition.to)!;
            return <g key={`${transition.from}-${transition.to}-${index}`}><line x1={from.x + 78} y1={from.y + 28} x2={to.x + 78} y2={to.y + 28} /><text x={(from.x + to.x) / 2 + 78} y={(from.y + to.y) / 2 + 18}>{transition.event}</text></g>;
          })}
        </svg>
        {positions.map((position) => <button key={position.state} className={`state-node ${(activeState ?? machine.initialState) === position.state ? "active" : ""}`} style={{ left: position.x, top: position.y }}><small>{position.state === machine.initialState ? "ENTRY" : "STATE"}</small><span>{position.state}</span></button>)}
      </div>
      <aside className="transition-list">
        <div className="panel-heading"><span>TRANSITIONS</span></div>
        {machine.transitions.map((transition, index) => (
          <button key={`${transition.event}-${index}`} onClick={() => onTrigger(transition.event)}>
            <span>{transition.from} → {transition.to}</span><b>{transition.event}</b><small>{transition.timeline ? `play ${transition.timeline}` : "no timeline"}</small>
          </button>
        ))}
        <div className="trace-list"><strong>TRACE</strong>{trace.slice(-5).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
      </aside>
    </div>
  );
}
