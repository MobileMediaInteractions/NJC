import type { LiveCoverageDetail } from "@harborline/contracts";

/**
 * Applies an incremental server snapshot without allowing a retracted update
 * to linger in an already-open timeline. The server remains authoritative for
 * the public count and explicitly supplies safe update-ID tombstones.
 */
export function mergeLiveCoverageSnapshot(
  current: LiveCoverageDetail,
  incoming: LiveCoverageDetail,
): LiveCoverageDetail {
  const removed = new Set(incoming.removedUpdateIds);
  const updates = new Map(
    current.updates
      .filter((update) => !removed.has(update.id))
      .map((update) => [update.id, update]),
  );
  for (const update of incoming.updates) updates.set(update.id, update);

  return {
    ...current,
    ...incoming,
    updateCount: incoming.updateCount,
    updates: [...updates.values()].sort(
      (left, right) => Date.parse(left.publishedAt) - Date.parse(right.publishedAt),
    ),
    removedUpdateIds: [],
  };
}
