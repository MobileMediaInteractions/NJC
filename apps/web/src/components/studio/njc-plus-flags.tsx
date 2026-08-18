"use client";
import { useState } from "react";
import { AlertTriangle, LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { FeatureFlagState } from "@/lib/feature-flags";
import {
  courierCutDistributionModes,
  resolveCourierCutDistributionMode,
  withCourierCutDistributionMode,
  type CourierCutDistributionMode,
} from "@/lib/courier-cut-contract";

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
  return <div className="space-y-5"><Card className="border-amber-500/30"><CardHeader><div className="flex items-center gap-3"><span className="rounded-full bg-amber-500/10 p-2 text-amber-500"><AlertTriangle /></span><div><CardTitle>Master public release</CardTitle><CardDescription>The parent switch overrides every child. Turning it off returns public NJC+ pages and APIs as not found.</CardDescription></div></div></CardHeader><CardContent><FlagRow flag={parent} disabled={!canManage} onChange={(enabled) => setFlags((current) => current.map((flag) => flag.key === parent.key ? { ...flag, enabled, effective: enabled } : { ...flag, effective: enabled && flag.enabled }))} /></CardContent></Card><div className="grid gap-4 lg:grid-cols-2">{flags.slice(1).map((flag) => <Card key={flag.key}><CardContent className="p-5"><FlagRow flag={flag} disabled={!canManage} parentEnabled={parent.enabled} onChange={(enabled) => setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled, effective: parent.enabled && enabled } : item))} />{flag.key === "njc_plus_preview_club" ? <CourierCutDistributionControl flag={flag} disabled={!canManage} onChange={(distributionMode) => setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, configuration: withCourierCutDistributionMode(item.configuration, distributionMode) } : item))} /> : null}</CardContent></Card>)}</div><div className="flex items-center gap-3"><Button onClick={() => void save()} disabled={!canManage || busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save feature controls</Button>{message ? <p className="text-sm" role="status">{message}</p> : null}</div></div>;
}
function FlagRow({ flag, disabled, parentEnabled = true, onChange }: { flag: FeatureFlagState; disabled: boolean; parentEnabled?: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-start justify-between gap-4"><span><span className="flex items-center gap-2 font-mono text-sm font-bold">{flag.key}{!parentEnabled ? <LockKeyhole className="size-3.5 text-muted-foreground" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{flag.description}</span><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[.62rem] font-black uppercase ${flag.effective ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{flag.effective ? "Effective" : "Inactive"}</span></span><Switch checked={flag.enabled} onCheckedChange={onChange} disabled={disabled} aria-label={`Toggle ${flag.key}`} /></label>; }

function CourierCutDistributionControl({ flag, disabled, onChange }: { flag: FeatureFlagState; disabled: boolean; onChange: (value: CourierCutDistributionMode) => void }) {
  const selected = resolveCourierCutDistributionMode(flag.configuration);
  return <fieldset className="mt-5 border-t pt-4" disabled={disabled}><legend className="text-xs font-bold">Authorized content surfaces</legend><p className="mt-1 text-xs leading-5 text-muted-foreground">The invite portal remains on the dedicated host. Content can stay in NJC+ only, or appear in both places. Courier Cut can never become the only viewing surface.</p><div className="mt-3 grid gap-2">{courierCutDistributionModes.map((mode) => <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-xs ${selected === mode ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="courier-cut-distribution" value={mode} checked={selected === mode} onChange={() => onChange(mode)} className="mt-0.5" /><span><strong className="block text-foreground">{mode === "njc_plus_only" ? "NJC+ only" : "NJC+ and The Courier Cut"}</strong><span className="mt-1 block text-muted-foreground">{mode === "njc_plus_only" ? "cut.thejerseycourier.com shows the invite portal; viewing continues in NJC+." : "The same invitation opens the cut on both NJC+ and cut.thejerseycourier.com."}</span></span></label>)}</div></fieldset>;
}
