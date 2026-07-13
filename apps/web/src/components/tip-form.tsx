"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function TipForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/tips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setState("sent");
      } else {
        setState("error");
        setMessage(payload?.error?.message ?? "Could not send your tip.");
      }
    } catch {
      setState("error");
      setMessage("The newsroom service could not be reached.");
    }
  }

  if (state === "sent") return <div className="flex items-start gap-3 border border-emerald-500/30 bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mt-0.5 size-5" /><div><p className="font-bold">Your tip reached the assignment desk.</p><p className="mt-1 text-sm">An editor may contact you if more information is needed.</p></div></div>;

  return <form className="space-y-5" onSubmit={submit}><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="tip-name">Name (optional)</Label><Input id="tip-name" name="name" /></div><div className="space-y-2"><Label htmlFor="tip-email">Email (optional)</Label><Input id="tip-email" name="email" type="email" /></div></div><div className="space-y-2"><Label htmlFor="tip-subject">What is this about?</Label><Input id="tip-subject" name="subject" required minLength={4} /></div><div className="space-y-2"><Label htmlFor="tip-body">What should we know?</Label><Textarea id="tip-body" name="body" required minLength={10} className="min-h-52" /></div><Button type="submit" className="bg-brand-blue" disabled={state === "sending"}>{state === "sending" && <Loader2 className="animate-spin" />} Send to the assignment desk</Button>{state === "error" && <p className="text-sm text-destructive">{message}</p>}<p className="text-xs text-muted-foreground">For highly sensitive material, the real launch should add a SecureDrop endpoint and avoid this form.</p></form>;
}
