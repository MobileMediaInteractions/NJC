"use client";

import { useState } from "react";
import { Bookmark, Heart } from "lucide-react";

export function DistributionOrganizer({
  itemId,
  initialCollection,
  initialFavorite,
}: {
  itemId: string;
  initialCollection: string | null;
  initialFavorite: boolean;
}) {
  const [collection, setCollection] = useState(initialCollection ?? "Saved");
  const [favorite, setFavorite] = useState(initialFavorite);
  const [saved, setSaved] = useState(Boolean(initialCollection));
  const [busy, setBusy] = useState(false);

  async function update(nextFavorite = favorite) {
    setBusy(true);
    const response = await fetch("/api/v1/distribution/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, collection, favorite: nextFavorite }),
    });
    if (response.ok) {
      setSaved(true);
      setFavorite(nextFavorite);
    }
    setBusy(false);
  }

  return (
    <div className="distribution-organizer">
      <label>
        <span className="sr-only">Collection</span>
        <input
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
          maxLength={80}
          placeholder="Collection"
        />
      </label>
      <button disabled={busy} onClick={() => void update()}>
        <Bookmark /> {saved ? "Saved" : "Organize"}
      </button>
      <button
        disabled={busy}
        className={favorite ? "is-active" : ""}
        onClick={() => void update(!favorite)}
        aria-label={favorite ? "Remove favorite" : "Add favorite"}
      >
        <Heart />
      </button>
    </div>
  );
}
