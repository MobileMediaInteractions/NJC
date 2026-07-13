import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CloudRain, Droplets, Map, Navigation, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { weatherSeed } from "@/lib/seed";

export const metadata: Metadata = { title: "Weather" };

export default function WeatherPage() {
  return (
    <div>
      <section className="bg-brand-navy py-10 text-white">
        <div className="container-news">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div><p className="eyebrow text-brand-yellow">Harborline Weather</p><h1 className="mt-2 text-5xl font-black tracking-[-0.055em] sm:text-6xl">{weatherSeed.location}</h1><p className="mt-2 text-white/60">Monday, July 13 · Updated 3:14 p.m.</p></div>
            <Button variant="outline" className="w-fit border-white/25 bg-transparent text-white hover:bg-white hover:text-brand-navy"><Navigation /> Use my location</Button>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <div className="flex items-center gap-8"><p className="text-8xl font-black tracking-[-0.08em]">{weatherSeed.temperature}°</p><div><CloudRain className="size-10 text-brand-yellow" /><p className="mt-2 text-xl font-bold">{weatherSeed.condition}</p><p className="mt-1 text-sm text-white/60">Feels like {weatherSeed.feelsLike}°</p></div></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <WeatherMetric icon={<CloudRain />} label="High / Low" value={`${weatherSeed.high}° / ${weatherSeed.low}°`} />
              <WeatherMetric icon={<Wind />} label="Wind" value={weatherSeed.wind} />
              <WeatherMetric icon={<Droplets />} label="Humidity" value={`${weatherSeed.humidity}%`} />
              <WeatherMetric icon={<Map />} label="Tide" value="High 9:18a" />
            </div>
          </div>
        </div>
      </section>
      {weatherSeed.alert && <section className="bg-brand-yellow py-4 text-brand-navy"><div className="container-news flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><p className="font-black uppercase tracking-wide">Coastal storm watch</p><p className="text-sm">{weatherSeed.alert} <Link href="/story/coastal-storm-watch-tuesday-high-tide" className="font-bold underline">See impacts and timing</Link></p></div></div></section>}
      <section className="container-news py-10">
        <h2 className="text-3xl font-black tracking-[-0.04em] text-brand-navy">Hour by hour</h2>
        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden border bg-border sm:grid-cols-6">{weatherSeed.hourly.map((hour) => <div key={hour.time} className="bg-white p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{hour.time}</p><CloudRain className="mx-auto my-4 size-6 text-brand-blue" /><p className="text-2xl font-black text-brand-navy">{hour.temperature}°</p><p className="mt-1 text-xs text-muted-foreground">{hour.condition}</p></div>)}</div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="relative min-h-[24rem] overflow-hidden bg-[linear-gradient(145deg,#dbeaf2_0%,#c4dce8_45%,#a9cbdc_100%)] p-8">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#0a4b78 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="relative"><p className="eyebrow text-brand-blue">Interactive radar placeholder</p><h2 className="mt-2 text-3xl font-black text-brand-navy">Precipitation approaching from the southwest</h2><p className="mt-3 max-w-md text-sm leading-6 text-brand-navy/65">Connect a preferred radar provider before launch. The product surface, alerts and mobile API contract are ready.</p><div className="mt-10 flex items-center gap-2"><span className="h-2 w-16 bg-emerald-400" /><span className="h-2 w-16 bg-yellow-400" /><span className="h-2 w-16 bg-orange-500" /><span className="h-2 w-16 bg-red-600" /></div></div>
          </div>
          <Card><CardContent className="p-6"><p className="eyebrow text-brand-blue">7-day outlook</p><div className="mt-4 divide-y">{[["Tue","68°","58°","Rain"],["Wed","75°","60°","Clearing"],["Thu","79°","63°","Sunny"],["Fri","81°","65°","Sunny"],["Sat","77°","62°","Cloudy"]].map(([day,high,low,condition]) => <div key={day} className="grid grid-cols-[3rem_1fr_auto] items-center py-4"><p className="font-bold text-brand-navy">{day}</p><p className="text-sm text-muted-foreground">{condition}</p><p className="font-bold">{high} <span className="font-normal text-muted-foreground">{low}</span></p></div>)}</div></CardContent></Card>
        </div>
      </section>
    </div>
  );
}

function WeatherMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="border border-white/15 p-4 [&_svg]:size-5 [&_svg]:text-brand-yellow"><div>{icon}</div><p className="mt-4 text-[0.62rem] font-bold uppercase tracking-wider text-white/50">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
