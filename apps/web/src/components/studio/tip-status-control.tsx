"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TipStatus } from "@/lib/newsroom-tips";

export function TipStatusControl({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: TipStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(nextStatus: TipStatus) {
    if (nextStatus === status || busy) return;
    const previous = status;
    setStatus(nextStatus);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/studio/tips/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(previous);
        setError(payload?.error?.message ?? "The tip status could not be changed.");
        return;
      }
      router.refresh();
    } catch {
      setStatus(previous);
      setError("The newsroom service could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-36 space-y-1.5">
      <div className="flex items-center gap-2">
        <Select
          value={status}
          disabled={busy}
          onValueChange={(value) => void update(value as TipStatus)}
        >
          <SelectTrigger aria-label="Tip status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
