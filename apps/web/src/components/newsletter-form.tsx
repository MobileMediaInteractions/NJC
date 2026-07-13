"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm({ inverse = false }: { inverse?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, lists: ["daily-brief"] }),
      });
      setState(response.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-emerald-500" /> You’re on the list. Watch your inbox.</p>;
  }

  return (
    <form onSubmit={subscribe} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <Input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className={inverse ? "h-11 border-white/25 bg-white text-brand-navy placeholder:text-brand-navy/50" : "h-11 bg-white"}
      />
      <Button type="submit" disabled={state === "loading"} className="h-11 shrink-0 bg-brand-yellow font-bold text-brand-navy hover:bg-brand-yellow/90">
        {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <>Sign me up <ArrowRight className="size-4" /></>}
      </Button>
      {state === "error" && <p className="text-sm text-red-500 sm:self-center">Please try again.</p>}
    </form>
  );
}
