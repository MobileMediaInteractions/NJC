import { NextResponse } from "next/server";
import { authorizeDeveloperRequest } from "@/lib/developer-api";
import { getWeatherSnapshot } from "@/lib/weather";

export async function GET(request: Request) {
  const auth = await authorizeDeveloperRequest(request, "weather:read");
  if (auth.response) return auth.response;
  try {
    const data = await getWeatherSnapshot();
    return NextResponse.json({ data, meta: { apiVersion: "1", source: data.source, observedAt: data.observedAt } }, { headers: auth.headers });
  } catch (error) {
    console.error("Developer weather lookup failed", error);
    return NextResponse.json({ error: { code: "weather_unavailable", message: "Live weather data is temporarily unavailable." } }, { status: 503, headers: auth.headers });
  }
}
