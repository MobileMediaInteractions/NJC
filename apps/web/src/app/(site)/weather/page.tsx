import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CloudRain, Droplets, Wind } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getWeatherSnapshot } from "@/lib/weather";

export const metadata: Metadata = { title: "Weather" };
export const revalidate = 900;

export default async function WeatherPage() {
  let weather;
  try {
    weather = await getWeatherSnapshot();
  } catch (error) {
    console.error("Weather page lookup failed", error);
    return <WeatherUnavailable />;
  }

  const updated = weather.observedAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(weather.observedAt))
    : "recently";

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white">
        <div className="container-news">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-brand-yellow">The New Jersey Courier Weather</p>
              <h1 className="mt-2 text-5xl font-black tracking-[-0.055em] sm:text-6xl">{weather.location}</h1>
              <p className="mt-2 text-white/60">Updated {updated} · {weather.source}</p>
            </div>
            <Link href="https://www.weather.gov/phi/" className="w-fit border border-white/25 px-4 py-2 text-sm font-bold hover:bg-white hover:text-brand-navy">Official NWS details</Link>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <div className="flex items-center gap-8">
              <p className="text-8xl font-black tracking-[-0.08em]">{weather.temperature}°</p>
              <div><CloudRain className="size-10 text-brand-yellow" /><p className="mt-2 text-xl font-bold">{weather.condition}</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <WeatherMetric icon={<CloudRain />} label="24-hour high / low" value={`${weather.high}° / ${weather.low}°`} />
              <WeatherMetric icon={<Wind />} label="Wind" value={weather.wind} />
              <WeatherMetric icon={<Droplets />} label="Humidity" value={weather.humidity ? `${weather.humidity}%` : "Unavailable"} />
            </div>
          </div>
        </div>
      </section>
      {weather.alert ? <section className="bg-brand-yellow py-4 text-brand-navy"><div className="container-news flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><p className="font-black uppercase tracking-wide">Active weather alert</p><p className="text-sm">{weather.alert}</p></div></div></section> : null}
      <section className="container-news py-10">
        <h2 className="text-3xl font-black tracking-[-0.04em] text-brand-navy">Hour by hour</h2>
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {weather.hourly.map((hour, index) => <div key={`${hour.time}-${index}`} className="bg-card p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{hour.time}</p><CloudRain className="mx-auto my-4 size-6 text-brand-blue" /><p className="text-2xl font-black text-brand-navy">{hour.temperature}°</p><p className="mt-1 text-xs text-muted-foreground">{hour.condition}</p></div>)}
        </div>
        {weather.daily?.length ? <Card className="mt-10"><CardContent className="p-6"><p className="eyebrow text-brand-blue">Extended outlook</p><div className="mt-4 divide-y">{weather.daily.map((period, index) => <div key={`${period.name}-${index}`} className="grid grid-cols-[7rem_1fr_auto] items-center gap-4 py-4"><p className="font-bold text-brand-navy">{period.name}</p><p className="text-sm text-muted-foreground">{period.condition}</p><p className="font-bold">{period.temperature}°{period.temperatureUnit}</p></div>)}</div></CardContent></Card> : null}
      </section>
    </div>
  );
}

function WeatherUnavailable() {
  return <div className="container-news py-24"><div className="mx-auto max-w-2xl border-t-4 border-brand-yellow bg-card p-8 text-center"><AlertTriangle className="mx-auto size-9 text-brand-yellow" /><h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-brand-navy">Live weather is temporarily unavailable.</h1><p className="mt-4 leading-7 text-muted-foreground">The site does not substitute sample forecasts when the National Weather Service cannot be reached.</p><Link href="https://www.weather.gov/phi/" className="mt-6 inline-flex bg-brand-navy px-5 py-3 text-sm font-bold text-white">Open the National Weather Service</Link></div></div>;
}

function WeatherMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="border border-white/15 p-4 [&_svg]:size-5 [&_svg]:text-brand-yellow"><div>{icon}</div><p className="mt-4 text-[0.62rem] font-bold uppercase tracking-wider text-white/50">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
