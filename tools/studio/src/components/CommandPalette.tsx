import { useMemo, useState } from "react";

export type StudioCommand = { id: string; label: string; detail?: string; shortcut?: string; run: () => void; disabled?: boolean };

export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: StudioCommand[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? commands.filter((command) => `${command.label} ${command.detail ?? ""}`.toLowerCase().includes(needle)) : commands;
  }, [commands, query]);
  if (!open) return null;
  const close = () => { setQuery(""); onClose(); };
  const execute = (command: StudioCommand | undefined) => {
    if (!command || command.disabled) return;
    command.run();
    close();
  };
  return (
    <div className="palette-backdrop" onMouseDown={close}>
      <div className="command-palette" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") close(); if (event.key === "Enter") execute(filtered.find((command) => !command.disabled)); }} placeholder="Search NJC Studio commands…" aria-label="Search commands" />
        <div>{filtered.length ? filtered.map((command) => <button key={command.id} onClick={() => execute(command)} disabled={command.disabled}><span>›</span><span><strong>{command.label}</strong>{command.detail && <small>{command.detail}</small>}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}</button>) : <p className="palette-empty">No matching commands</p>}</div>
        <small>Use Enter to run the first available command. Workspace tasks remain protected by trust.</small>
      </div>
    </div>
  );
}
