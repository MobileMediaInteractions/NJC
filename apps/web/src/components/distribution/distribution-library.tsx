"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  CalendarClock,
  Files,
  Search,
} from "lucide-react";
import type { DistributionLibraryPackage } from "@/lib/distribution";

type Sort = "date" | "size" | "name";

export function DistributionLibrary({
  packages,
}: {
  packages: DistributionLibraryPackage[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState<Sort>("date");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return packages
      .filter(
        (record) =>
          (!normalized ||
            `${record.title} ${record.description}`
              .toLowerCase()
              .includes(normalized)) &&
          (kind === "all" || record.mediaTypes.includes(kind)),
      )
      .sort((left, right) => {
        if (sort === "name") return left.title.localeCompare(right.title);
        if (sort === "size") return right.totalSize - left.totalSize;
        return right.updatedAt.getTime() - left.updatedAt.getTime();
      });
  }, [kind, packages, query, sort]);

  return (
    <>
      <section className="distribution-tools" aria-label="Library controls">
        <label>
          <Search />
          <span className="sr-only">Search packages</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your releases"
          />
        </label>
        <label>
          <Files />
          <span className="sr-only">Media type</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">All media</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="image">Images</option>
            <option value="application">Documents</option>
            <option value="text">Text</option>
            <option value="story">Stories</option>
          </select>
        </label>
        <label>
          <ArrowDownWideNarrow />
          <span className="sr-only">Sort packages</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            <option value="date">Newest first</option>
            <option value="size">Largest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </section>
      {visible.length ? (
        <section className="distribution-grid" aria-label="Available packages">
          {visible.map((record, index) => (
            <article key={record.id} className="distribution-package-card">
              <Link href={`/distribution/package/${record.slug}`}>
                <div className="distribution-card-art">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Files />
                </div>
                <div>
                  <p>{record.mediaTypes.join(" · ") || "Release package"}</p>
                  <h2>{record.title}</h2>
                  <span>{record.description}</span>
                  <footer>
                    <small>
                      {record.itemCount} item{record.itemCount === 1 ? "" : "s"} ·{" "}
                      {formatBytes(record.totalSize)}
                    </small>
                    {record.expiresAt ? (
                      <small>
                        <CalendarClock /> Expires{" "}
                        {record.expiresAt.toLocaleDateString()}
                      </small>
                    ) : null}
                  </footer>
                </div>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="distribution-empty">
          <Files />
          <h2>No matching releases</h2>
          <p>
            {packages.length
              ? "Change the search, media type, or sorting controls."
              : "No active distribution packages have been shared with this account."}
          </p>
        </section>
      )}
    </>
  );
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
