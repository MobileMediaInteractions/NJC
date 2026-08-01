"use client";

import { useMemo, useState } from "react";
import { History, Search, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { platformFeatureRegistry, platformKeys, registryValue } from "@/lib/platform-feature-registry";
import type { SiteConfiguration } from "@/lib/site-settings";

export type ConfigurationHistoryRow = {
  revision: number;
  reason: string;
  environment: string;
  affectedPlatforms: string[];
  changedByClerkId: string;
  rolledBackFromRevision: number | null;
  createdAt: string;
};

export function ConfigurationRegistryPanel({
  configuration,
  revision,
  history,
  operationalHealth,
  canManage,
}: {
  configuration: SiteConfiguration;
  revision: number;
  history: ConfigurationHistoryRow[];
  operationalHealth: { database: boolean; identity: boolean; scheduler: boolean };
  canManage: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const [rollbackRevision, setRollbackRevision] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const categories = [...new Set(platformFeatureRegistry.map((entry) => entry.category))].sort();
  const visible = useMemo(
    () =>
      platformFeatureRegistry.filter(
        (entry) =>
          (platform === "all" || entry.platforms.includes(platform as never)) &&
          (category === "all" || entry.category === category) &&
          `${entry.name} ${entry.description} ${entry.key}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, platform, category],
  );

  async function rollback() {
    if (!rollbackRevision) return;
    const response = await fetch(
      `/api/v1/studio/settings/revisions/${rollbackRevision}/rollback`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: revision,
          reason,
          confirmation: "ROLL BACK CONFIGURATION",
        }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error?.message ?? "Rollback failed");
      return;
    }
    setMessage(`Revision ${rollbackRevision} restored as a new revision.`);
    setRollbackRevision(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Typed platform registry</CardTitle>
          <CardDescription>
            {platformFeatureRegistry.length} registered capabilities across every
            shipping application, service, integration and safety boundary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(operationalHealth).map(([key, healthy]) => (
              <Badge key={key} variant={healthy ? "secondary" : "destructive"} className="capitalize">
                {key}: {healthy ? "connected" : "setup required"}
              </Badge>
            ))}
            <Badge variant="outline">Schema v{configuration.registry.schemaVersion}</Badge>
            <Badge variant="outline">Configuration r{revision}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_13rem_13rem]">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search features, keys or responsibilities" className="pl-9" aria-label="Search platform registry" />
            </div>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger aria-label="Filter registry by platform"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All platforms</SelectItem>{platformKeys.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filter registry by category"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {visible.map((entry) => {
              const value = registryValue(configuration, entry.configurationPath);
              return (
                <article key={entry.key} className="rounded-xl border p-4 [content-visibility:auto]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><h3 className="font-semibold">{entry.name}</h3><p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">{entry.key}</p></div>
                    <Badge variant={entry.classification === "mandatory-safety-control" ? "default" : "outline"}>{typeof value === "boolean" ? value ? "Enabled" : "Disabled" : entry.availability}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{entry.description}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.68rem]">
                    <div><dt className="text-muted-foreground">Class</dt><dd>{entry.classification}</dd></div>
                    <div><dt className="text-muted-foreground">Rollout</dt><dd>{entry.rollout}</dd></div>
                    <div><dt className="text-muted-foreground">Owner</dt><dd>{entry.owner}</dd></div>
                    <div><dt className="text-muted-foreground">Permission</dt><dd>{entry.permission}</dd></div>
                  </dl>
                  <p className="mt-3 text-[0.68rem] text-muted-foreground">Platforms: {entry.platforms.join(", ")}</p>
                  {entry.dependencies.length ? <p className="mt-1 text-[0.68rem] text-muted-foreground">Depends on: {entry.dependencies.join(", ")}</p> : null}
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5" /> Configuration history and rollback</CardTitle><CardDescription>Every successful save is immutable. Rollback creates a new audited revision.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {history.length ? (
            <div className="divide-y rounded-lg border">
              {history.map((row) => (
                <div key={row.revision} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div><p className="font-medium">Revision {row.revision} · {row.reason}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()} · {row.environment} · {row.affectedPlatforms.join(", ") || "no runtime flags"}</p></div>
                  {canManage && row.revision !== revision ? <Button size="sm" variant="outline" onClick={() => setRollbackRevision(row.revision)}>Prepare rollback</Button> : <Badge variant="secondary">{row.revision === revision ? "Current" : "History"}</Badge>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">History begins with the next saved configuration.</p>}
          {rollbackRevision ? (
            <div className="space-y-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="font-medium">Restore revision {rollbackRevision}</p>
              <Label htmlFor="rollback-reason">Required audit reason</Label>
              <Input id="rollback-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why this known-good state is being restored" />
              <div className="flex gap-2"><Button variant="outline" onClick={() => setRollbackRevision(null)}>Cancel</Button><Button onClick={() => void rollback()} disabled={reason.trim().length < 12}><ShieldCheck /> Confirm audited rollback</Button></div>
            </div>
          ) : null}
          {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
