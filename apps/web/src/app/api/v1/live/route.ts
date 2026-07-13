import { NextResponse } from "next/server";
import { getLiveSnapshot } from "@/lib/live";

export async function GET() {
  return NextResponse.json({ data: await getLiveSnapshot(), meta: { apiVersion: "1" } });
}
