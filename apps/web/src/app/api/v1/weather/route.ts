import { NextResponse } from "next/server";
import { getWeatherSnapshot } from "@/lib/weather";

export const revalidate = 900;

export async function GET() {
  try {
    const data = await getWeatherSnapshot();
    return NextResponse.json({ data, meta: { apiVersion: "1", source: data.source, observedAt: data.observedAt } });
  } catch (error) {
    console.error("Public weather lookup failed", error);
    return NextResponse.json({ error: { code: "weather_unavailable", message: "Live weather data is temporarily unavailable." } }, { status: 503 });
  }
}
