"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Download, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ExportRow = { id: string; checksumSha256: string; size: number; createdAt: string; expiresAt: string | null };

export function ExportManager() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [passphrase, setPassphrase] = useState("");
  const [includeMedia, setIncludeMedia] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/studio/exports");
    const payload = await response.json();
    if (response.ok) setRows(payload.data);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/studio/exports").then(async (response) => {
      const payload = await response.json();
      if (active && response.ok) setRows(payload.data);
    });
    return () => { active = false; };
  }, []);

  async function create() {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/v1/studio/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase, includeMedia }),
    });
    const payload = await response.json();
    if (response.ok) {
      setNotice("Encrypted export created. Save the passphrase separately; Harborline never stores it.");
      setPassphrase("");
      await load();
    } else {
      setNotice(payload.error?.message ?? "Export failed.");
    }
    setBusy(false);
  }

  return <div className="space-y-6">
    <Card><CardHeader><div className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary"><Archive className="size-5" /></div><CardTitle>Create a complete portable export</CardTitle><CardDescription>Postgres data in SQL, JSON and CSV; tracked Blob media; configuration names; migrations; checksums; and a restore guide. The result is AES-256-GCM encrypted.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="backup-passphrase">Backup passphrase</Label><Input id="backup-passphrase" type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} minLength={14} placeholder="At least 14 characters" /><p className="text-xs text-muted-foreground">This value is used in memory and is never written to the database or Blob metadata.</p></div><Label className="flex max-w-lg items-center justify-between gap-4 rounded-md border p-4"><span><span className="block font-semibold">Include media files</span><span className="mt-1 block text-xs font-normal text-muted-foreground">For very large libraries, use the CLI streaming workflow documented in docs/PORTABLE_BACKUP.md.</span></span><Switch checked={includeMedia} onCheckedChange={setIncludeMedia} /></Label><Button onClick={() => void create()} disabled={busy || passphrase.length < 14}>{busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Create encrypted export</Button>{notice ? <p className="rounded-md bg-muted p-3 text-sm" role="status">{notice}</p> : null}</CardContent></Card>
    <Card><CardHeader><CardTitle>Recent exports</CardTitle><CardDescription>Private Blob copies expire operationally after 30 days. Download and store them in a separate secured location.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Size</TableHead><TableHead>SHA-256</TableHead><TableHead className="text-right">Download</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell><TableCell>{(row.size / 1_000_000).toFixed(2)} MB</TableCell><TableCell><code className="text-[0.65rem]">{row.checksumSha256.slice(0, 18)}…</code></TableCell><TableCell className="text-right"><Button asChild variant="outline" size="sm"><a href={`/api/v1/studio/exports/${row.id}/download`}><Download /> Download</a></Button></TableCell></TableRow>)}</TableBody></Table>{!rows.length ? <p className="py-10 text-center text-sm text-muted-foreground">No exports have been created in this environment.</p> : null}</CardContent></Card>
  </div>;
}
