import { NextRequest, NextResponse } from "next/server";
import { getPublishedStories } from "@/lib/content";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";

export async function GET(request: NextRequest) {
  const authorization = await authorizeReaderApiRequest(request);
  if (authorization.response) return authorization.response;
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category") ?? undefined;
  const query = searchParams.get("q") ?? undefined;
  const requestedLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  const data = await getPublishedStories({ category, query, limit });

  return NextResponse.json({
    data,
    meta: {
      apiVersion: "1",
      count: data.length,
      limit,
      category: category ?? null,
      query: query ?? null,
    },
  }, { headers: authorization.headers });
}
