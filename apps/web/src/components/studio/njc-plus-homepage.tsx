"use client";
import { useState } from "react";
import { LoaderCircle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { premiumContent, premiumHomepageModules } from "@harborline/backend/schema";

const moduleTypes = ["lead", "live_now", "breaking_takeover", "investigation", "video_spotlight", "series", "podcast", "latest", "most_watched", "most_listened", "most_read", "shows", "upcoming", "editors_picks", "continue_watching", "continue_listening", "recommended", "trial_promotion"] as const;
type Module = typeof premiumHomepageModules.$inferSelect;
type Content = typeof premiumContent.$inferSelect;

export function NjcPlusHomepageComposer({ initial, content, canManage }: { initial: Module[]; content: Content[]; canManage: boolean }) {
  const [modules, setModules] = useState(initial);
  const [editing, setEditing] = useState<Partial<Module>>({ moduleType: "lead", title: "", eyebrow: "", contentIds: [], sortOrder: initial.length, enabled: true, configuration: {} });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/studio/njc-plus/homepage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editing, contentIds: editing.contentIds ?? [], configuration: editing.configuration ?? {} }) });
    const payload = await response.json() as { data?: Module; error?: { message?: string } };
    if (response.ok && payload.data) { setModules((items) => [...items.filter((item) => item.id !== payload.data!.id), payload.data!].sort((a,b) => a.sortOrder-b.sortOrder)); setEditing({ moduleType: "lead", title: "", eyebrow: "", contentIds: [], sortOrder: modules.length + 1, enabled: true, configuration: {} }); setMessage("Homepage module saved."); } else setMessage(payload.error?.message || "Module could not be saved.");
    setBusy(false);
  }
  return <div className="grid gap-6 xl:grid-cols-[1fr_22rem]"><Card><CardHeader><CardTitle>Broadcast rundown</CardTitle><CardDescription>Modules render in this order. Active date windows and feature flags are applied on the server.</CardDescription></CardHeader><CardContent>{modules.length ? <div className="divide-y">{modules.map((module, index) => <button key={module.id} onClick={() => setEditing(module)} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-3 text-left hover:text-primary"><span className="font-mono text-muted-foreground">{index + 1}</span><span><strong className="block">{module.title || module.moduleType.replaceAll("_", " ")}</strong><small className="text-muted-foreground">{module.moduleType} · {module.contentIds.length} selected</small></span><span className={module.enabled ? "text-emerald-500" : "text-muted-foreground"}>{module.enabled ? "On" : "Off"}</span></button>)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">No modules yet. The public homepage can still use automatic editorial grouping, but a rundown gives Studio exact control.</p>}</CardContent></Card>
    <Card className="h-fit"><CardHeader><Plus className="size-5 text-primary" /><CardTitle>{editing.id ? "Edit module" : "Add module"}</CardTitle><CardDescription>Choose real content already present in NJC+.</CardDescription></CardHeader><CardContent className="space-y-4"><Field label="Layout"><Select value={editing.moduleType ?? "lead"} onValueChange={(value) => setEditing((item) => ({ ...item, moduleType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{moduleTypes.map((type) => <SelectItem key={type} value={type}>{type.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></Field><Field label="Heading"><Input value={editing.title ?? ""} onChange={(event) => setEditing((item) => ({ ...item, title: event.target.value }))} /></Field><Field label="Order"><Input type="number" min={0} value={editing.sortOrder ?? 0} onChange={(event) => setEditing((item) => ({ ...item, sortOrder: Number(event.target.value) }))} /></Field><Label className="flex items-center justify-between rounded-md border p-3">Enabled<Switch checked={editing.enabled ?? true} onCheckedChange={(enabled) => setEditing((item) => ({ ...item, enabled }))} /></Label><div><Label>Content</Label><div className="mt-2 max-h-72 space-y-1 overflow-auto rounded-md border p-2">{content.map((item) => <Label key={item.id} className="flex cursor-pointer gap-2 rounded p-2 text-xs hover:bg-muted"><input type="checkbox" checked={(editing.contentIds ?? []).includes(item.id)} onChange={(event) => setEditing((module) => ({ ...module, contentIds: event.target.checked ? [...(module.contentIds ?? []), item.id] : (module.contentIds ?? []).filter((id) => id !== item.id) }))} /><span>{item.title}<small className="block text-muted-foreground">{item.kind}</small></span></Label>)}</div></div><Button className="w-full" disabled={!canManage || busy} onClick={() => void save()}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save module</Button>{message ? <p className="text-xs" role="status">{message}</p> : null}</CardContent></Card></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <Label className="block space-y-2"><span>{label}</span>{children}</Label>; }
