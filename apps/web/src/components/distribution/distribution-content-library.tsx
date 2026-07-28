"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { File, Heart, Search } from "lucide-react";
import { DistributionOrganizer } from "@/components/distribution/distribution-organizer";
import type { DistributionLibraryItem } from "@/lib/distribution";

export function DistributionContentLibrary({
  items,
}: {
  items: DistributionLibraryItem[];
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [collection, setCollection] = useState("all");
  const [sort, setSort] = useState<"date" | "size" | "name" | "type">("date");
  const collections = useMemo(
    () => [...new Set(items.map((item) => item.collection).filter(Boolean))],
    [items],
  );
  const visible = useMemo(
    () =>
      items
        .filter((item) => {
          const haystack =
            `${item.title} ${item.description} ${item.packageTitle}`.toLowerCase();
          const mediaType = item.mimeType.split("/")[0];
          return (
            (!query.trim() || haystack.includes(query.trim().toLowerCase())) &&
            (type === "all" ||
              type === mediaType ||
              (type === "favorite" && item.favorite)) &&
            (collection === "all" || item.collection === collection)
          );
        })
        .sort((left, right) =>
          sort === "name"
            ? left.title.localeCompare(right.title)
            : sort === "type"
              ? left.mimeType.localeCompare(right.mimeType) ||
                left.title.localeCompare(right.title)
            : sort === "size"
              ? right.size - left.size
              : right.createdAt.getTime() - left.createdAt.getTime(),
        ),
    [collection, items, query, sort, type],
  );
  return (
    <section className="distribution-all-content">
      <header>
        <p>Every authorized item</p>
        <h2>All content</h2>
      </header>
      <div className="distribution-tools">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files and stories"
            aria-label="Search all content"
          />
        </label>
        <label>
          <span className="sr-only">Content type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All types</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="image">Images</option>
            <option value="application">Documents</option>
            <option value="text">Text</option>
            <option value="story">Stories</option>
            <option value="favorite">Favorites</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Collection</span>
          <select
            value={collection}
            onChange={(event) => setCollection(event.target.value)}
          >
            <option value="all">All collections</option>
            {collections.map((value) => (
              <option key={value} value={value!}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort content</span>
          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value as "date" | "size" | "name" | "type",
              )
            }
          >
            <option value="date">Newest first</option>
            <option value="size">Largest first</option>
            <option value="type">Media type</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className="distribution-content-list">
          {visible.map((item) => (
            <article key={item.id}>
              <Link
                href={
                  item.fileId
                    ? `/distribution/file/${item.fileId}`
                    : `/distribution/item/${item.id}`
                }
              >
                <File />
                <div>
                  <small>
                    {item.packageTitle} · {item.mimeType}
                  </small>
                  <strong>{item.title}</strong>
                  <span>
                    {item.size ? formatBytes(item.size) : "Advance story"} ·{" "}
                    {item.createdAt.toLocaleDateString()}
                  </span>
                </div>
                {item.favorite ? <Heart className="is-favorite" /> : null}
              </Link>
              <DistributionOrganizer
                itemId={item.id}
                initialCollection={item.collection}
                initialFavorite={item.favorite}
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="distribution-empty">
          <File />
          <h2>No matching content</h2>
          <p>Change the type, collection, search, or favorite filter.</p>
        </div>
      )}
    </section>
  );
}

function formatBytes(value: number) {
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
