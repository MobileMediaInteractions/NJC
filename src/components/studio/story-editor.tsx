"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, CloudUpload, Eye, Loader2, Save, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  ["local", "Local"], ["weather", "Weather"], ["investigates", "Harborline Investigates"], ["sports", "Sports"], ["culture", "Things to Do"],
];

export function StoryEditor() {
  const [headline, setHeadline] = useState("");
  const [dek, setDek] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("local");
  const [location, setLocation] = useState("Port Alder");
  const [tags, setTags] = useState("");
  const [breaking, setBreaking] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const slug = headline.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  async function save(status: "draft" | "review" | "published") {
    setState("saving"); setMessage("");
    const categoryLabel = categories.find(([value]) => value === category)?.[1] ?? "Local";
    try {
      const response = await fetch("/api/v1/studio/stories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ headline, slug, dek, body: body.split(/\n\n+/).map((item) => item.trim()).filter(Boolean), categorySlug: category, categoryLabel, location, imageUrl: "", imageAlt: "", tags: tags.split(",").map((item) => item.trim()).filter(Boolean), status, isBreaking: breaking }) });
      const payload = await response.json().catch(() => null);
      if (response.ok) { setState("saved"); setMessage(status === "published" ? "Published successfully." : "Story saved to the newsroom."); }
      else { setState("error"); setMessage(payload?.error?.message ?? "Could not save the story."); }
    } catch {
      setState("error");
      setMessage("The newsroom service could not be reached.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground"><Link href="/studio/stories"><ArrowLeft /> All stories</Link></Button><h1 className="text-3xl font-bold tracking-tight">Create story</h1><p className="mt-1 text-sm text-muted-foreground">Draft, collaborate, review and publish from one workspace.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline"><Eye /> Preview</Button><Button variant="outline" onClick={() => save("draft")} disabled={state === "saving"}><Save /> Save draft</Button><Button onClick={() => save("review")} disabled={state === "saving"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Send />} Send to review</Button></div></div>
      {message && <div className={`mb-5 flex items-center gap-2 rounded-md border p-3 text-sm ${state === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}><CheckCircle2 className="size-4" />{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card><CardHeader><CardTitle>Story</CardTitle><CardDescription>Required fields are checked before the story enters review.</CardDescription></CardHeader><CardContent className="space-y-6">
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="headline">Headline</Label><span className="text-xs text-muted-foreground">{headline.length}/180</span></div><Textarea id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Write a clear, specific local headline" className="min-h-24 resize-none text-xl font-semibold" maxLength={180} /><p className="text-xs text-muted-foreground">/{slug || "story-slug"}</p></div>
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="dek">Summary</Label><span className="text-xs text-muted-foreground">{dek.length}/320</span></div><Textarea id="dek" value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two sentences explaining what happened and why it matters" maxLength={320} /></div>
          <Separator />
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="body">Story body</Label><Button variant="ghost" size="sm" className="text-primary"><Sparkles /> Suggest structure</Button></div><Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the story here. Separate paragraphs with a blank line." className="min-h-[34rem] resize-y leading-7" /><p className="text-xs text-muted-foreground">{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 220))} min read</p></div>
        </CardContent></Card>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label>Section</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="location">Dateline</Label><Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="tags">Tags</Label><Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="housing, city hall" /></div><Separator /><div className="flex items-center justify-between"><div><Label htmlFor="breaking">Breaking news</Label><p className="mt-1 text-xs text-muted-foreground">Adds urgent public treatment.</p></div><Switch id="breaking" checked={breaking} onCheckedChange={setBreaking} /></div><Button className="w-full" variant="secondary" onClick={() => save("published")} disabled={state === "saving"}>Publish now</Button></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Lead media</CardTitle><CardDescription>JPEG, PNG or WebP up to 4 MB.</CardDescription></CardHeader><CardContent><button type="button" className="flex min-h-36 w-full flex-col items-center justify-center rounded-md border border-dashed text-center text-muted-foreground hover:border-primary hover:text-primary"><CloudUpload className="size-6" /><span className="mt-2 text-sm font-medium">Upload image</span><span className="mt-1 text-xs">or choose from media</span></button></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium">Workflow</span><Badge variant="secondary">Draft</Badge></div><div className="mt-4 flex items-center gap-2 text-[0.7rem] text-muted-foreground"><span className="size-2 rounded-full bg-primary" /> Draft <span>→</span> Review <span>→</span> Scheduled <span>→</span> Published</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
