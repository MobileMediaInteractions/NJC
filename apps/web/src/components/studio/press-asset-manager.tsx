"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CatalogAsset = { id: string; slug: string; title: string; description: string; category: string; mimeType: string; version: string; visibility: string; approvedUsageTypes: string[]; restrictions: string[]; attribution: string | null; active: boolean; sourceKind: string };
type MediaAsset = { id: string; filename: string; mimeType: string; license: string | null; credit: string | null };
const standardUses = ["editorial", "broadcast", "podcast", "review", "research", "educational", "event"];

export function PressAssetManager({ initialAssets, canManage }: { initialAssets: CatalogAsset[]; canManage: boolean }) {
  const [assets, setAssets] = useState(initialAssets);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("images");
  const [visibility, setVisibility] = useState("public");
  const [restrictions, setRestrictions] = useState("Credit the named rights holder.\nDo not imply endorsement, partnership, or sponsorship.");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/v1/studio/media?pageSize=100&status=ready&deleted=active").then((response) => response.json())
      .then((payload) => setMedia((payload.data ?? []).filter((item: MediaAsset) => item.license))).catch(() => undefined);
  }, [canManage]);

  async function update(id: string, values: Partial<CatalogAsset>) {
    setBusy(true); setNotice("");
    const response = await fetch("/api/v1/studio/press-kit/assets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...values }) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) { setAssets((current) => current.map((asset) => asset.id === id ? { ...asset, ...payload.asset } : asset)); setNotice("Press catalog updated."); }
    else setNotice(payload.error?.message ?? "The asset could not be updated.");
    setBusy(false);
  }

  function chooseMedia(id: string) {
    setSelectedMedia(id);
    const item = media.find((asset) => asset.id === id);
    if (!item) return;
    const base = item.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    setTitle(base.replace(/\b\w/g, (letter) => letter.toUpperCase()));
    setSlug(base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    setDescription(`Approved ${item.mimeType.split("/")[0]} asset from the Courier Media Library.`);
  }

  async function create() {
    setBusy(true); setNotice("");
    const chosen = media.find((asset) => asset.id === selectedMedia);
    const response = await fetch("/api/v1/studio/press-kit/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mediaAssetId: selectedMedia, title, slug, description, category, visibility,
      approvedUsageTypes: standardUses,
      restrictions: restrictions.split("\n").map((item) => item.trim()).filter(Boolean),
      attribution: chosen?.credit ?? null,
      version: "1",
    }) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) { setAssets((current) => [...current, payload.asset]); setSelectedMedia(""); setTitle(""); setSlug(""); setDescription(""); setNotice("Asset added to the press catalog."); }
    else setNotice(payload.error?.message ?? "The asset could not be created.");
    setBusy(false);
  }

  return <div className="grid gap-5 xl:grid-cols-[1fr_0.48fr]">
    <Card><CardHeader><CardTitle>Authorized asset catalog</CardTitle><CardDescription>Only catalog IDs—not model-provided paths—can enter a package. Deactivation affects future decisions and does not rewrite old manifests.</CardDescription></CardHeader><CardContent className="grid gap-3">{assets.map((asset) => <div key={asset.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{asset.title}</p><Badge variant={asset.active ? "secondary" : "outline"}>{asset.active ? "Active" : "Inactive"}</Badge><Badge variant="outline" className="capitalize">{asset.visibility}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{asset.description}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{asset.id} · v{asset.version} · {asset.mimeType}</p></div>{canManage ? <div className="flex gap-2"><select value={asset.visibility} onChange={(event) => update(asset.id, { visibility: event.target.value })} disabled={busy} className="h-9 rounded-md border bg-background px-2 text-xs"><option value="public">Public</option><option value="restricted">Restricted</option><option value="private">Private</option></select><Button size="sm" variant={asset.active ? "outline" : "default"} onClick={() => update(asset.id, { active: !asset.active })} disabled={busy}>{asset.active ? "Deactivate" : "Activate"}</Button></div> : null}</div>)}</CardContent></Card>
    <Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><FilePlus2 className="size-4" /> Add approved media</CardTitle><CardDescription>Select a rights-documented Media Library item. Storage files and paths can never be entered manually.</CardDescription></CardHeader><CardContent>{canManage ? <div className="space-y-4"><label className="block text-sm font-medium">Media Library asset<select value={selectedMedia} onChange={(event) => chooseMedia(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 font-normal"><option value="">Select a licensed asset</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}</select></label><label className="block text-sm font-medium">Catalog title<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block text-sm font-medium">Stable slug<Input className="mt-2" value={slug} onChange={(event) => setSlug(event.target.value)} /></label><label className="block text-sm font-medium">Description<Textarea className="mt-2" value={description} onChange={(event) => setDescription(event.target.value)} /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-2 font-normal"><option value="images">Images</option><option value="logos">Logos</option><option value="screenshots">Screenshots</option><option value="video">Video</option><option value="documents">Documents</option></select></label><label className="text-sm font-medium">Availability<select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-2 font-normal"><option value="public">Automatic public review</option><option value="restricted">Manual review</option><option value="private">Private/manual only</option></select></label></div><label className="block text-sm font-medium">Restrictions, one per line<Textarea className="mt-2 min-h-28" value={restrictions} onChange={(event) => setRestrictions(event.target.value)} /></label><Button className="w-full" onClick={create} disabled={busy || !selectedMedia || !title || !slug || !description}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Add to allowlist</Button><p className="text-xs text-muted-foreground">Need another file? <Link href="/studio/media" className="text-primary underline">Upload it and document its license in Media Library first.</Link></p></div> : <p className="text-sm text-muted-foreground">Administrator access is required to change asset authorization metadata.</p>}{notice ? <p className="mt-4 rounded-md bg-muted p-3 text-xs">{notice}</p> : null}</CardContent></Card>
  </div>;
}
