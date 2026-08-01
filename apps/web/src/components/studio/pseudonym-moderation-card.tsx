"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ModerationStatus = "active" | "disabled" | "correction_required";

export function PseudonymModerationCard({ accountId, pseudonym, status, reason }: { accountId: string; pseudonym: string | null; status: ModerationStatus; reason: string | null }) {
  const router = useRouter();
  const [action, setAction] = useState<"disable" | "restore" | "require_correction">(status === "active" ? "require_correction" : "restore");
  const [auditReason, setAuditReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/v1/studio/users/${encodeURIComponent(accountId)}/pseudonym`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason: auditReason }) });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error?.message ?? "Moderation failed");
    setMessage("Moderation saved. The author retains control of the pseudonym text."); setAuditReason(""); router.refresh();
  }
  return <Card><CardHeader><CardTitle>Pseudonym moderation</CardTitle><CardDescription>Moderate use without editing another person’s public identity.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border p-3 text-sm"><p className="font-medium">{pseudonym ?? "No pseudonym saved"}</p><p className="mt-1 capitalize text-muted-foreground">Status: {status.replace("_", " ")}</p>{reason ? <p className="mt-1 text-muted-foreground">Last reason: {reason}</p> : null}</div><div className="space-y-2"><Label>Action</Label><Select value={action} onValueChange={(value) => setAction(value as typeof action)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="require_correction">Require author correction</SelectItem><SelectItem value="disable">Disable pseudonym</SelectItem><SelectItem value="restore">Restore pseudonym</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="pseudonym-reason">Required audit reason</Label><Input id="pseudonym-reason" value={auditReason} onChange={(event) => setAuditReason(event.target.value)} placeholder="Explain the policy or identity concern" /></div><div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs"><ShieldAlert className="size-4 shrink-0" /><p>This can hold scheduled stories using the pseudonym. It never rewrites a published byline.</p></div>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}<Button onClick={submit} disabled={busy || auditReason.trim().length < 12}>{busy ? <Loader2 className="animate-spin" /> : null}Apply moderation</Button></CardContent></Card>;
}
