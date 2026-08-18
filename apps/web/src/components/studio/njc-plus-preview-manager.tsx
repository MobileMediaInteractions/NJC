"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Plus, Save, Send, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { StudioAccountPicker } from "@/components/studio/guided-selectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { StudioAccountSummary } from "@/lib/studio-account-types";

type Question = { id?: string; prompt: string; questionType: "rating" | "multiple_choice" | "yes_no" | "free_response"; required: boolean; options: string[]; sortOrder: number };
type Invitation = { id: string; userClerkId: string; status: string; startsAt: string; expiresAt: string | null; firstViewedAt: string | null; lastViewedAt: string | null; completedAt: string | null; revokedAt: string | null };
type PreviewPayload = { configuration: { enabled: boolean; disclaimer: string; opensAt: string | null; expiresAt: string | null }; invitations: Invitation[]; questions: Question[]; responses: Array<{ invitationId: string; overallRating: number | null; writtenFeedback: string; answers: Array<{ questionId: string; value: string | number | boolean }>; submittedAt: string }>; accounts: Array<Pick<StudioAccountSummary, "id" | "displayName" | "username">> } | null;
const defaultDisclaimer = "This is private preview material and may include unfinished picture, sound, music, visual effects, credits or placeholders. It may not represent the final release.";

export function NjcPlusPreviewManager({ contentId }: { contentId: string }) {
  const [data, setData] = useState<PreviewPayload>(null);
  const [enabled, setEnabled] = useState(false);
  const [disclaimer, setDisclaimer] = useState(defaultDisclaimer);
  const [opensAt, setOpensAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [account, setAccount] = useState<StudioAccountSummary | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/v1/studio/njc-plus/content/${contentId}/preview`, { cache: "no-store" });
    const payload = await response.json() as { data?: PreviewPayload; error?: { message?: string } };
    if (!response.ok) setMessage(payload.error?.message || "The Courier Cut could not be loaded.");
    const next = payload.data ?? null; setData(next);
    if (next) { setEnabled(next.configuration.enabled); setDisclaimer(next.configuration.disclaimer); setOpensAt(toLocal(next.configuration.opensAt)); setExpiresAt(toLocal(next.configuration.expiresAt)); setQuestions(next.questions); }
    setBusy(false);
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [contentId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/v1/studio/njc-plus/content/${contentId}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { data?: PreviewPayload; error?: { message?: string } };
    if (response.ok) { setData(payload.data ?? null); setMessage(success); }
    else setMessage(payload.error?.message || "The Courier Cut could not be updated.");
    setBusy(false);
  }
  function save() { return action({ action: "configure", configuration: { enabled, disclaimer, opensAt: fromLocal(opensAt), expiresAt: fromLocal(expiresAt), questions: questions.map((question, index) => ({ ...question, sortOrder: index })) } }, "Courier Cut settings saved and audited."); }
  async function invite() { if (!account) return; await action({ action: "invite", userClerkId: account.id, expiresAt: fromLocal(inviteExpiresAt) }, `${account.displayName} can now access this preview.`); setAccount(null); setInviteExpiresAt(""); }
  const ratings = data?.responses.flatMap((response) => response.overallRating === null ? [] : [response.overallRating]) ?? [];
  const averageRating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;

  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="size-5" /> The Courier Cut</CardTitle><CardDescription>Invite existing accounts to unreleased material. Access, expiration and revocation are enforced server-side and remain separate from NJC+ membership.</CardDescription></CardHeader><CardContent className="space-y-6">
    <Label className="flex items-center justify-between rounded-lg border p-4"><span><strong className="block">Enable private early access</strong><small className="text-muted-foreground">Unpublished content remains excluded from browse, search, APIs and indexing.</small></span><Switch checked={enabled} onCheckedChange={setEnabled} /></Label>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Opens (optional)"><Input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} /></Field><Field label="Expires (optional)"><Input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field></div>
    <Field label="Viewer warning"><Textarea rows={3} value={disclaimer} onChange={(event) => setDisclaimer(event.target.value)} /></Field>
    <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Feedback questions</h3><p className="text-xs text-muted-foreground">Overall rating and written reaction are always available.</p></div><Button type="button" variant="outline" onClick={() => setQuestions((current) => [...current, { prompt: "", questionType: "free_response", required: false, options: [], sortOrder: current.length }])}><Plus /> Add question</Button></div>{questions.map((question, index) => <div key={question.id ?? index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_12rem_auto]"><Input aria-label={`Question ${index + 1}`} placeholder="What should viewers respond to?" value={question.prompt} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))} /><Select value={question.questionType} onValueChange={(value) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, questionType: value as Question["questionType"] } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rating">Rating scale</SelectItem><SelectItem value="multiple_choice">Multiple choice</SelectItem><SelectItem value="yes_no">Yes / no</SelectItem><SelectItem value="free_response">Free response</SelectItem></SelectContent></Select><Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></Button>{question.questionType === "multiple_choice" ? <Input className="md:col-span-2" placeholder="Choices separated by commas" value={question.options.join(", ")} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : item))} /> : null}<Label className="flex items-center gap-2 text-xs"><Switch checked={question.required} onCheckedChange={(required) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, required } : item))} /> Required</Label></div>)}</section>
    <div className="flex justify-end"><Button type="button" onClick={() => void save()} disabled={busy || disclaimer.length < 40 || questions.some((question) => question.prompt.length < 3)}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save Courier Cut</Button></div>
    {data ? <section className="space-y-4 border-t pt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold">Invite viewers</h3><p className="text-xs text-muted-foreground">Search the verified Clerk account directory; no account IDs need to be typed.</p></div><p className="text-xs text-muted-foreground"><strong className="text-foreground">{data.responses.length}</strong> response{data.responses.length === 1 ? "" : "s"}{averageRating === null ? "" : ` · ${averageRating.toFixed(1)}/5 average`}</p></div><StudioAccountPicker value={account} onChange={setAccount} disabled={busy} /><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Field label="Invitation expires (optional)"><Input type="datetime-local" value={inviteExpiresAt} onChange={(event) => setInviteExpiresAt(event.target.value)} /></Field><Button type="button" className="self-end" disabled={!account || busy} onClick={() => void invite()}><Send /> Send access</Button></div><div className="space-y-2">{data.invitations.map((invitation) => { const response = data.responses.find((item) => item.invitationId === invitation.id); const viewer = data.accounts.find((item) => item.id === invitation.userClerkId); return <article key={invitation.id} className="grid gap-3 rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{viewer?.displayName ?? "Unavailable account"}</p><p className="text-xs text-muted-foreground">{viewer?.username ? `@${viewer.username} · ` : ""}{invitation.status.replaceAll("_", " ")}{invitation.lastViewedAt ? ` · Last viewed ${new Date(invitation.lastViewedAt).toLocaleString()}` : " · Not viewed"}{response ? ` · ${response.overallRating ?? "No"}/5 rating` : " · No feedback"}</p></div>{invitation.status !== "revoked" ? <Button type="button" variant="outline" className="text-destructive" onClick={() => void action({ action: "revoke", invitationId: invitation.id }, "Preview access revoked immediately.")}><ShieldCheck /> Revoke</Button> : null}</div>{response ? <details className="rounded-md bg-muted/40 p-3 text-sm"><summary className="cursor-pointer font-semibold">Read submitted feedback</summary><p className="mt-3 whitespace-pre-wrap text-muted-foreground">{response.writtenFeedback || "No written reaction."}</p>{response.answers.length ? <dl className="mt-3 space-y-2">{response.answers.map((answer) => <div key={answer.questionId}><dt className="text-xs font-semibold">{data.questions.find((question) => question.id === answer.questionId)?.prompt ?? "Archived question"}</dt><dd className="text-xs text-muted-foreground">{typeof answer.value === "boolean" ? answer.value ? "Yes" : "No" : String(answer.value)}</dd></div>)}</dl> : null}<p className="mt-3 text-[.65rem] text-muted-foreground">Submitted {new Date(response.submittedAt).toLocaleString()}</p></details> : null}</article>; })}{!data.invitations.length ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No invited viewers yet.</div> : null}</div></section> : null}
    {message ? <p className="rounded-md border p-3 text-sm" role="status">{message}</p> : null}
  </CardContent></Card>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <Label className="space-y-2"><span>{label}</span>{children}</Label>; }
function toLocal(value: string | null) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function fromLocal(value: string) { return value ? new Date(value).toISOString() : null; }
