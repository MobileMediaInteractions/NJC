import type { WeatherSnapshot } from "@harborline/contracts";
import { siteConfig } from "@/lib/site";

const NWS_BASE_URL = "https://api.weather.gov";
const CACHE_SECONDS = 900;

type ForecastPeriod = {
  name?: string;
  startTime?: string;
  temperature?: number;
  temperatureUnit?: string;
  shortForecast?: string;
  windSpeed?: string;
  windDirection?: string;
  relativeHumidity?: { value?: number | null };
};

type NwsFeature<T> = { properties?: T };

function userAgent() {
  return process.env.NWS_USER_AGENT?.trim() || "njcourier-vercel-preview (weather integration; contact not configured)";
}

async function nwsJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": userAgent(),
    },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`NWS request failed with status ${response.status}`);
  return (await response.json()) as T;
}

function formatHour(value?: string) {
  if (!value) return "Now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    timeZone: siteConfig.timezone,
  }).format(new Date(value));
}

export async function getWeatherSnapshot(): Promise<WeatherSnapshot> {
  const { latitude, longitude } = siteConfig.coordinates;
  const point = await nwsJson<NwsFeature<{ forecast?: string; forecastHourly?: string }>>(
    `${NWS_BASE_URL}/points/${latitude},${longitude}`,
  );
  const forecastUrl = point.properties?.forecast;
  const hourlyUrl = point.properties?.forecastHourly;
  if (!forecastUrl || !hourlyUrl) throw new Error("NWS point response did not include forecast endpoints");

  const [forecast, hourly, alerts] = await Promise.all([
    nwsJson<NwsFeature<{ updated?: string; periods?: ForecastPeriod[] }>>(forecastUrl),
    nwsJson<NwsFeature<{ updated?: string; periods?: ForecastPeriod[] }>>(hourlyUrl),
    nwsJson<{ features?: Array<NwsFeature<{ headline?: string; description?: string }>> }>(
      `${NWS_BASE_URL}/alerts/active?point=${latitude},${longitude}`,
    ),
  ]);

  const hourlyPeriods = hourly.properties?.periods ?? [];
  const dailyPeriods = forecast.properties?.periods ?? [];
  const current = hourlyPeriods[0];
  if (!current || typeof current.temperature !== "number") throw new Error("NWS hourly forecast is unavailable");

  const nextDayTemperatures = hourlyPeriods
    .slice(0, 24)
    .map((period) => period.temperature)
    .filter((temperature): temperature is number => typeof temperature === "number");
  const high = nextDayTemperatures.length ? Math.max(...nextDayTemperatures) : current.temperature;
  const low = nextDayTemperatures.length ? Math.min(...nextDayTemperatures) : current.temperature;
  const alert = alerts.features?.[0]?.properties;

  return {
    location: siteConfig.city,
    temperature: current.temperature,
    feelsLike: current.temperature,
    condition: current.shortForecast || "Forecast available",
    high,
    low,
    wind: [current.windDirection, current.windSpeed].filter(Boolean).join(" ") || "Unavailable",
    humidity: Math.round(current.relativeHumidity?.value ?? 0),
    alert: alert?.headline || alert?.description,
    hourly: hourlyPeriods.slice(0, 6).map((period, index) => ({
      time: index === 0 ? "Now" : formatHour(period.startTime),
      temperature: period.temperature ?? current.temperature!,
      condition: period.shortForecast || "Forecast available",
    })),
    daily: dailyPeriods.slice(0, 8).map((period) => ({
      name: period.name || "Upcoming",
      temperature: period.temperature ?? current.temperature!,
      temperatureUnit: period.temperatureUnit || "F",
      condition: period.shortForecast || "Forecast available",
    })),
    observedAt: hourly.properties?.updated || forecast.properties?.updated || new Date().toISOString(),
    source: "National Weather Service",
  };
}
