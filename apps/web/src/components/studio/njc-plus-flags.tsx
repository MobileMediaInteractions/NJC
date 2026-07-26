"use client";
import { useState } from "react";
import { AlertTriangle, LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { FeatureFlagState } from "@/lib/feature-flags";

export function NjcPlusFlags({ initial, canManage }: { initial: FeatureFlagState[]; canManage: boolean }) {
  const [flags, setFlags] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const parent = flags[0];
  async function save() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/studio/njc-plus/flags", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flags: flags.map(({ key, enabled, configuration }) => ({ key, enabled, configuration })) }) });
    const payload = await response.json() as { data?: FeatureFlagState[]; error?: { message?: string } };
    if (response.ok && payload.data) { setFlags(payload.data); setMessage("Release controls saved and audited."); } else setMessage(payload.error?.message || "Release controls could not be saved.");
    setBusy(false);
  }
  return <div className="space-y-5"><Card className="border-amber-500/30"><CardHeader><div className="flex items-center gap-3"><span className="rounded-full bg-amber-500/10 p-2 text-amber-500"><AlertTriangle /></span><div><CardTitle>Master public release</CardTitle><CardDescription>The parent switch overrides every child. Turning it off returns public NJC+ pages and APIs as not found.</CardDescription></div></div></CardHeader><CardContent><FlagRow flag={parent} disabled={!canManage} onChange={(enabled) => setFlags((current) => current.map((flag) => flag.key === parent.key ? { ...flag, enabled, effective: enabled } : { ...flag, effective: enabled && flag.enabled }))} /></CardContent></Card><div className="grid gap-4 lg:grid-cols-2">{flags.slice(1).map((flag) => <Card key={flag.key}><CardContent className="p-5"><FlagRow flag={flag} disabled={!canManage} parentEnabled={parent.enabled} onChange={(enabled) => setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled, effective: parent.enabled && enabled } : item))} /></CardContent></Card>)}</div><div className="flex items-center gap-3"><Button onClick={() => void save()} disabled={!canManage || busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save feature controls</Button>{message ? <p className="text-sm" role="status">{message}</p> : null}</div></div>;
}
function FlagRow({ flag, disabled, parentEnabled = true, onChange }: { flag: FeatureFlagState; disabled: boolean; parentEnabled?: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-start justify-between gap-4"><span><span className="flex items-center gap-2 font-mono text-sm font-bold">{flag.key}{!parentEnabled ? <LockKeyhole className="size-3.5 text-muted-foreground" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{flag.description}</span><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[.62rem] font-black uppercase ${flag.effective ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{flag.effective ? "Effective" : "Inactive"}</span></span><Switch checked={flag.enabled} onCheckedChange={onChange} disabled={disabled} aria-label={`Toggle ${flag.key}`} /></label>; }
