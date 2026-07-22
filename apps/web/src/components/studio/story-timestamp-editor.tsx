"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StoryTimestampEditor({
  id,
  publishedAt,
  updatedAt,
  publicationTimezone,
}: {
  id: string;
  publishedAt: string;
  updatedAt: string;
  publicationTimezone: string;
}) {
  const router = useRouter();
  const [publishedValue, setPublishedValue] = useState(() => toLocalInput(publishedAt));
  const [updatedValue, setUpdatedValue] = useState(() => toLocalInput(updatedAt));
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    setMessage("");
    const parsedPublishedAt = new Date(publishedValue);
    const parsedUpdatedAt = new Date(updatedValue);
    if (
      Number.isNaN(parsedPublishedAt.getTime()) ||
      Number.isNaN(parsedUpdatedAt.getTime())
    ) {
      setState("error");
      setMessage("Enter valid published and updated dates.");
      return;
    }
    try {
      const response = await fetch(
        `/api/v1/studio/stories/${encodeURIComponent(id)}/timestamps`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            publishedAt: parsedPublishedAt.toISOString(),
            updatedAt: parsedUpdatedAt.toISOString(),
            reason,
            acknowledgeReportingRisk: acknowledged,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = Object.values(
          payload?.error?.details?.fieldErrors ?? {},
        ).flat()[0];
        setState("error");
        setMessage(detail ?? payload?.error?.message ?? "The timestamps could not be saved.");
        return;
      }
      setState("saved");
      setMessage("Public timestamps changed and recorded in the audit history.");
      setAcknowledged(false);
      setReason("");
      router.refresh();
    } catch {
      setState("error");
      setMessage("The newsroom service could not be reached.");
    }
  }

  return (
    <Card className="border-2 border-destructive/50">
      <CardHeader>
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <CardTitle className="text-base text-destructive">
              Public timestamp override
            </CardTitle>
            <CardDescription className="mt-2 leading-5">
              Changing these values alters what readers, feeds, apps and search
              engines understand about when reporting was published or updated.
              It can affect chronology, corrections, legal records and trust.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="override-published-at">Published</Label>
          <Input id="override-published-at" type="datetime-local" value={publishedValue} onChange={(event) => setPublishedValue(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="override-updated-at">Last updated</Label>
          <Input id="override-updated-at" type="datetime-local" value={updatedValue} onChange={(event) => setUpdatedValue(event.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Inputs use your device timezone. The publication timezone is {publicationTimezone}.
        </p>
        <div className="space-y-2">
          <Label htmlFor="timestamp-reason">Required editorial reason</Label>
          <Textarea id="timestamp-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={500} placeholder="Explain the correction, migration or archival reason for this change." />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-4 accent-red-600" />
          <span>I understand this changes the public reporting record and that the reason and before/after values will be audited.</span>
        </label>
        <Button variant="destructive" onClick={() => void save()} disabled={state === "saving" || !acknowledged || reason.trim().length < 10} className="w-full">
          {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <CheckCircle2 /> : null}
          Save timestamp override
        </Button>
        {message ? <p role={state === "error" ? "alert" : "status"} className={`text-xs ${state === "error" ? "text-destructive" : "text-emerald-400"}`}>{message}</p> : null}
      </CardContent>
    </Card>
  );
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
