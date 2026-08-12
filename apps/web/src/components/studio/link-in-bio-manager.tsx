"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Eye, EyeOff, Link2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { socialSources } from "@/lib/link-in-bio";

type Entry = {
  id: string;
  slug: string;
  storyId: string;
  displayTitle: string | null;
  sortOrder: number;
  isVisible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  clickCount: number;
  lastClickedAt: string | null;
  headline: string;
  dek: string;
  categoryLabel: string;
  imageUrl: string | null;
  publishedAt: string | null;
};

type StoryOption = {
  id: string;
  slug: string;
  headline: string;
  categoryLabel: string;
  publishedAt: string;
};

const publicOrigin = process.env.NEXT_PUBLIC_LINKS_URL?.replace(/\/$/, "") ??
  "https://links.thejerseycourier.com";

export function LinkInBioManager({
  enabled,
  entries: initialEntries,
  stories,
}: {
  enabled: boolean;
  entries: Entry[];
  stories: StoryOption[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [storyId, setStoryId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const availableStories = useMemo(() => {
    const selected = new Set(entries.map((entry) => entry.storyId));
    return stories.filter((story) => !selected.has(story.id));
  }, [entries, stories]);

  async function addEntry() {
    if (!storyId) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/studio/link-in-bio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyId,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error?.message ?? "The story could not be added.");
      return;
    }
    setStoryId("");
    setStartsAt("");
    setEndsAt("");
    setMessage("Story added to Link in Bio.");
    await reloadEntries();
  }

  async function updateEntry(id: string, changes: Partial<Pick<Entry, "displayTitle" | "isVisible">>) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/v1/studio/link-in-bio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error?.message ?? "The link could not be updated.");
      return;
    }
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes } : entry));
    setMessage("Link settings saved.");
  }

  async function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= entries.length) return;
    const reordered = [...entries];
    [reordered[index], reordered[destination]] = [reordered[destination]!, reordered[index]!];
    setEntries(reordered);
    setBusy(true);
    const response = await fetch("/api/v1/studio/link-in-bio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((entry) => entry.id) }),
    });
    setBusy(false);
    if (!response.ok) {
      setEntries(entries);
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error?.message ?? "The new order could not be saved.");
      return;
    }
    setMessage("Public story order updated.");
  }

  async function remove(entry: Entry) {
    if (!window.confirm(`Remove “${entry.displayTitle || entry.headline}” from Link in Bio? The article itself will not be deleted.`)) return;
    setBusy(true);
    const response = await fetch(`/api/v1/studio/link-in-bio/${entry.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error?.message ?? "The link could not be removed.");
      return;
    }
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setMessage("Link removed. The published article was not changed.");
  }

  async function reloadEntries() {
    const response = await fetch("/api/v1/studio/link-in-bio", {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(payload.data)) {
      setEntries(payload.data.map((entry: Entry & { startsAt?: string | null; endsAt?: string | null; lastClickedAt?: string | null; publishedAt?: string | null }) => ({
        ...entry,
        startsAt: entry.startsAt ?? null,
        endsAt: entry.endsAt ?? null,
        lastClickedAt: entry.lastClickedAt ?? null,
        publishedAt: entry.publishedAt ?? null,
      })));
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Link in Bio</h1>
            <Badge variant={enabled ? "secondary" : "outline"}>{enabled ? "Public" : "Disabled in configuration"}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose published reporting, control its public order, and copy a source-aware profile URL for each social platform. Article links and slugs are populated automatically.</p>
        </div>
        <Button asChild variant="outline"><Link href={publicOrigin} target="_blank"><ExternalLink /> Open public page</Link></Button>
      </header>

      {!enabled ? <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="py-4 text-sm">The page currently redirects to the publication. Enable <strong>Features → Link in Bio</strong> in Configuration when this lineup is ready.</CardContent></Card> : null}

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-4" /> Add a published story</CardTitle><CardDescription>No IDs or URLs to type. Only currently published Courier articles are selectable.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="bio-story">Article</Label><select id="bio-story" value={storyId} onChange={(event) => setStoryId(event.target.value)} className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select a published story</option>{availableStories.map((story) => <option key={story.id} value={story.id}>{story.headline} · {story.categoryLabel}</option>)}</select></div>
              <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">Optional availability window</summary><div className="mt-4 grid gap-4"><div><Label htmlFor="bio-start">Show after</Label><Input id="bio-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div><div><Label htmlFor="bio-end">Hide after</Label><Input id="bio-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div></div></details>
              <Button className="w-full" onClick={() => void addEntry()} disabled={busy || !storyId}>{busy ? <Loader2 className="animate-spin" /> : <Link2 />} Add to public page</Button>
              {!availableStories.length ? <p className="text-xs text-muted-foreground">Every available published story is already included.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Profile URLs</CardTitle><CardDescription>Use the matching URL in each social profile so analytics retain the source.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {socialSources.map((source) => {
                const value = `${publicOrigin}?source=${source}`;
                return <button key={source} type="button" onClick={() => void copy(value, source)} className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"><span className="capitalize">{source}</span>{copied === source ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-muted-foreground" />}</button>;
              })}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Public story order</CardTitle><CardDescription>{entries.length} curated article{entries.length === 1 ? "" : "s"}. Hidden or scheduled entries stay in Studio without appearing publicly.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry, index) => (
              <article key={entry.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[6rem_1fr_auto] lg:items-center">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">{entry.imageUrl ? <Image src={entry.imageUrl} alt="" fill sizes="96px" className="object-cover" /> : <div className="grid h-full place-items-center"><Link2 className="size-5 text-muted-foreground" /></div>}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{entry.categoryLabel}</Badge>{entry.isVisible ? <Badge variant="secondary"><Eye /> Visible</Badge> : <Badge variant="outline"><EyeOff /> Hidden</Badge>}</div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">links.thejerseycourier.com/{entry.slug}</p>
                  <Input className="mt-2 font-semibold" value={entry.displayTitle ?? ""} placeholder={entry.headline} onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, displayTitle: event.target.value || null } : item))} />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{entry.clickCount.toLocaleString()} redirects</span><span>{entry.lastClickedAt ? `Last used ${new Date(entry.lastClickedAt).toLocaleDateString()}` : "Not opened yet"}</span>{entry.startsAt ? <span>Starts {new Date(entry.startsAt).toLocaleString()}</span> : null}{entry.endsAt ? <span>Ends {new Date(entry.endsAt).toLocaleString()}</span> : null}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1 lg:w-36 lg:justify-end">
                  <Button variant="ghost" size="icon" onClick={() => void move(index, -1)} disabled={busy || index === 0} aria-label={`Move ${entry.headline} up`}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void move(index, 1)} disabled={busy || index === entries.length - 1} aria-label={`Move ${entry.headline} down`}><ArrowDown /></Button>
                  <Switch checked={entry.isVisible} disabled={busy} onCheckedChange={(isVisible) => void updateEntry(entry.id, { isVisible })} aria-label={`Show ${entry.headline}`} />
                  <Button variant="ghost" size="icon" onClick={() => void updateEntry(entry.id, { displayTitle: entry.displayTitle })} disabled={busy} aria-label={`Save title for ${entry.headline}`}><Save /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void remove(entry)} disabled={busy} aria-label={`Remove ${entry.headline}`}><Trash2 /></Button>
                </div>
              </article>
            ))}
            {!entries.length ? <div className="rounded-xl border border-dashed p-10 text-center"><Link2 className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-semibold">No social stories selected</p><p className="mt-1 text-sm text-muted-foreground">Choose the first published article from the picker.</p></div> : null}
            {message ? <p className="rounded-lg border bg-muted/30 p-3 text-sm" role="status">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
