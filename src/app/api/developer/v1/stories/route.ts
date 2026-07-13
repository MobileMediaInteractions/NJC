import { NextRequest, NextResponse } from "next/server";
import { authorizeDeveloperRequest } from "@/lib/developer-api";
import { getPublishedStories } from "@/lib/content";
export async function GET(request: NextRequest) { const auth = await authorizeDeveloperRequest(request, "news:read"); if (auth.response) return auth.response; const requested = Number(request.nextUrl.searchParams.get("limit") ?? 20); const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 20; const data = await getPublishedStories({ category: request.nextUrl.searchParams.get("category") ?? undefined, query: request.nextUrl.searchParams.get("q") ?? undefined, limit }); return NextResponse.json({ data, meta: { apiVersion: "1", count: data.length } }, { headers: auth.headers }); }
