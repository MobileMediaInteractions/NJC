"use client";

import { useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const choices = ["Traffic safety", "Housing choices", "Local businesses", "Open space"];

export function WeeklyPulse() {
  const [choice, setChoice] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <aside className="border-t-4 border-brand-yellow bg-brand-navy p-6 text-white sm:p-8" aria-labelledby="weekly-pulse-title">
      <div className="flex items-center justify-between"><p className="eyebrow text-brand-yellow">Public Square · Weekly Pulse</p><BarChart3 className="size-5 text-brand-yellow" /></div>
      <h2 id="weekly-pulse-title" className="font-editorial mt-4 text-3xl font-semibold leading-tight">What should lead the next Route 9 redevelopment plan?</h2>
      <p className="mt-3 text-sm leading-6 text-white/65">Choose one priority. Preview votes stay on this device and are not included in public results.</p>
      {submitted ? (
        <div className="mt-7 border border-white/20 bg-white/5 p-5"><Check className="size-6 text-brand-yellow" /><p className="mt-3 font-bold">Preview vote recorded: {choice}</p><p className="mt-2 text-sm text-white/60">Production voting will include eligibility, duplicate-vote controls, methodology and an audit trail.</p><button type="button" className="mt-4 text-xs font-bold uppercase tracking-wider text-brand-yellow underline" onClick={() => setSubmitted(false)}>Change preview choice</button></div>
      ) : (
        <form className="mt-6" onSubmit={(event) => { event.preventDefault(); if (choice) setSubmitted(true); }}>
          <fieldset className="space-y-2"><legend className="sr-only">Route 9 redevelopment priorities</legend>{choices.map((item) => <label key={item} className="flex cursor-pointer items-center gap-3 border border-white/15 px-4 py-3 text-sm hover:border-brand-yellow"><input type="radio" name="weekly-pulse" value={item} checked={choice === item} onChange={() => setChoice(item)} className="accent-[#C49545]" />{item}</label>)}</fieldset>
          <Button type="submit" disabled={!choice} className="mt-5 w-full bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90">Cast preview vote</Button>
        </form>
      )}
      <p className="mt-5 text-[0.65rem] leading-5 text-white/45">Non-scientific reader engagement preview. Production results publish Sunday with response totals and expert context.</p>
    </aside>
  );
}
