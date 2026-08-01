"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuthorChoice = { id: string; name: string; isViewer: boolean; pseudonymAvailable: boolean };
type SelectedAuthor = { userId: string; mode: "account" | "pseudonym" };

export function StoryAuthorControl({ storyId, published, choices, initialAuthors, canManage, canCorrectPseudonym }: { storyId: string; published: boolean; choices: AuthorChoice[]; initialAuthors: SelectedAuthor[]; canManage: boolean; canCorrectPseudonym: boolean }) {
  const router = useRouter();
  const [authors, setAuthors] = useState(initialAuthors);
  const [next, setNext] = useState(choices.find((choice) => !initialAuthors.some((author) => author.userId === choice.id))?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  function move(index: number, delta: number) { const copy = [...authors]; const target = index + delta; if (target < 0 || target >= copy.length) return; [copy[index], copy[target]] = [copy[target]!, copy[index]!]; setAuthors(copy); }
  async function saveAuthors() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/v1/studio/stories/${storyId}/authors`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ authors }) });
    const payload = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) return setMessage(payload?.error?.message ?? "Authors could not be saved");
    setMessage("Ownership and collaborative bylines saved. The story returned to Draft for review."); router.refresh();
  }
  async function correct(mode: "account" | "pseudonym") {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/v1/studio/stories/${storyId}/byline-correction`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, reason, confirmation: "CORRECT BYLINE" }) });
    const payload = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) return setMessage(payload?.error?.message ?? "Byline correction failed");
    setMessage("Historical byline corrected without changing the author’s profile identity."); setReason(""); router.refresh();
  }
  const canEditOwnByline = choices.some((choice) => choice.isViewer && authors.some((author) => author.userId === choice.id));
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="size-5" /> Public authors</CardTitle><CardDescription>{published ? "Published snapshots remain immutable except through this audited correction path." : "The first author owns the story. Publishers manage the team; each collaborator may opt only their own byline into an active pseudonym."}</CardDescription></CardHeader><CardContent className="space-y-4">{published ? <><div className="space-y-2"><Label htmlFor="byline-correction-reason">Required correction reason</Label><Input id="byline-correction-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the verified correction" /></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void correct("account")} disabled={!canManage || busy || reason.trim().length < 20}>Restore verified account byline</Button>{canCorrectPseudonym ? <Button onClick={() => void correct("pseudonym")} disabled={busy || reason.trim().length < 20}>Use my saved pseudonym</Button> : null}</div></> : <>{authors.map((author, index) => { const choice = choices.find((item) => item.id === author.userId); return <div key={author.userId} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_10rem_auto]"><div><p className="font-medium">{choice?.name ?? "Unavailable account"}</p><p className="text-xs text-muted-foreground">{index === 0 ? "Owner and primary byline" : `Contributor ${index + 1}`}</p></div><Select value={author.mode} onValueChange={(mode) => setAuthors((current) => current.map((item) => item.userId === author.userId ? { ...item, mode: mode as SelectedAuthor["mode"] } : item))} disabled={!choice?.isViewer || !choice.pseudonymAvailable}><SelectTrigger aria-label={`Public byline for ${choice?.name ?? "author"}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="account">Account name</SelectItem>{choice?.isViewer && choice.pseudonymAvailable ? <SelectItem value="pseudonym">My pseudonym</SelectItem> : null}</SelectContent></Select><div className="flex"><Button aria-label={`Move ${choice?.name ?? "author"} up`} size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={!canManage || index === 0}><ArrowUp /></Button><Button aria-label={`Move ${choice?.name ?? "author"} down`} size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={!canManage || index === authors.length - 1}><ArrowDown /></Button><Button aria-label={`Remove ${choice?.name ?? "author"}`} size="icon" variant="ghost" onClick={() => setAuthors((current) => current.filter((item) => item.userId !== author.userId))} disabled={!canManage || authors.length === 1}><Trash2 /></Button></div></div>; })}{canManage ? <div className="flex gap-2"><Select value={next} onValueChange={setNext}><SelectTrigger className="flex-1" aria-label="Add an active staff author"><SelectValue placeholder="Choose active staff account" /></SelectTrigger><SelectContent>{choices.filter((choice) => !authors.some((author) => author.userId === choice.id)).map((choice) => <SelectItem key={choice.id} value={choice.id}>{choice.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => { if (!next) return; setAuthors((current) => [...current, { userId: next, mode: "account" }]); setNext(""); }} disabled={!next || authors.length >= 8}><Plus /> Add</Button></div> : null}<Button onClick={() => void saveAuthors()} disabled={(!canManage && !canEditOwnByline) || busy || authors.length === 0}>{busy ? <Loader2 className="animate-spin" /> : null}Save public bylines</Button></>}{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}</CardContent></Card>;
}
