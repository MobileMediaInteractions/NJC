import type { FileEntry } from "../model/protocol";

function fileIcon(entry: FileEntry) {
  if (entry.kind === "directory") return "▾";
  if (entry.name.endsWith(".pani")) return "◆";
  if (entry.name.endsWith(".json")) return "{}";
  if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) return "TS";
  if (entry.name.endsWith(".rs")) return "Rs";
  return "·";
}

export function Explorer({ files, activePath, onOpen }: { files: FileEntry[]; activePath: string; onOpen: (path: string) => void }) {
  return (
    <nav className="explorer" aria-label="Project files">
      <div className="panel-heading"><span>EXPLORER</span><button title="Refresh project">↻</button></div>
      <div className="explorer-tree">
        {files.map((entry) => (
          <button
            className={`file-row ${activePath === entry.path ? "active" : ""}`}
            key={entry.path}
            onClick={() => entry.kind === "file" && onOpen(entry.path)}
            style={{ paddingLeft: 10 + entry.depth * 15 }}
            aria-current={activePath === entry.path ? "page" : undefined}
            disabled={entry.kind === "directory"}
          >
            <span className={`file-icon ${entry.kind}`}>{fileIcon(entry)}</span>
            <span>{entry.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
