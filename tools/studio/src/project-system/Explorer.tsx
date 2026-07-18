import { useCallback, useMemo, useState } from "react";
import type { FileEntry } from "../model/protocol";

function fileIcon(entry: FileEntry) {
  if (entry.kind === "directory") return "▾";
  if (entry.name.endsWith(".pani")) return "◆";
  if (entry.name.endsWith(".json")) return "{}";
  if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) return "TS";
  if (entry.name.endsWith(".rs")) return "Rs";
  return "·";
}

export function Explorer({ files, activePath, onOpen, onCreate, onRefresh }: { files: FileEntry[]; activePath: string; onOpen: (path: string) => void; onCreate: () => void; onRefresh: () => void }) {
  const [query, setQuery] = useState("");
  const [directoryOverrides, setDirectoryOverrides] = useState<Record<string, boolean>>({});
  const isCollapsed = useCallback((entry: FileEntry) => directoryOverrides[entry.path] ?? (entry.depth === 0 && !activePath.startsWith(`${entry.path}/`)), [activePath, directoryOverrides]);
  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) return files.filter((entry) => entry.kind === "file" && entry.path.toLowerCase().includes(needle));
    const collapsedPaths = files.filter((entry) => entry.kind === "directory" && isCollapsed(entry)).map((entry) => entry.path);
    return files.filter((entry) => !collapsedPaths.some((directory) => entry.path.startsWith(`${directory}/`)));
  }, [files, isCollapsed, query]);
  const toggle = (entry: FileEntry) => setDirectoryOverrides((current) => ({ ...current, [entry.path]: !isCollapsed(entry) }));
  return (
    <nav className="explorer" aria-label="Project files">
      <div className="panel-heading"><span>EXPLORER</span><div><button onClick={onCreate} title="New animation">＋</button><button onClick={onRefresh} title="Refresh project">↻</button></div></div>
      <label className="explorer-search"><span>Search files</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files" /></label>
      <div className="explorer-tree">
        {visibleFiles.map((entry) => (
          <button
            className={`file-row ${activePath === entry.path ? "active" : ""}`}
            key={entry.path}
            onClick={() => entry.kind === "file" ? onOpen(entry.path) : toggle(entry)}
            style={{ paddingLeft: 10 + entry.depth * 15 }}
            aria-current={activePath === entry.path ? "page" : undefined}
            aria-expanded={entry.kind === "directory" ? !isCollapsed(entry) : undefined}
          >
            <span className={`file-icon ${entry.kind}`}>{entry.kind === "directory" && isCollapsed(entry) ? "▸" : fileIcon(entry)}</span>
            <span>{entry.name}</span>
          </button>
        ))}
        {visibleFiles.length === 0 && <div className="explorer-empty">No matching files</div>}
      </div>
    </nav>
  );
}
