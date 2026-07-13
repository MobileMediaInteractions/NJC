import { NextResponse } from "next/server";
import { weatherSeed } from "@/lib/seed";

export const revalidate = 900;

export function GET() {
  return NextResponse.json({ data: weatherSeed, meta: { apiVersion: "1", source: "harborline-demo", observedAt: new Date().toISOString() } });
}
