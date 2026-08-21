import { NextRequest, NextResponse } from "next/server";
import { getPublishedStories } from "@/lib/content";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";
import { projectStoriesForReader } from "@/lib/reader-api-compatibility";

export async function GET(request: NextRequest) {
  const authorization = await authorizeReaderApiRequest(request);
  if (authorization.response) return authorization.response;
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category") ?? undefined;
  const query = searchParams.get("q") ?? undefined;
  const requestedLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  const stories = await getPublishedStories({ category, query, limit });
  const { data, profile } = projectStoriesForReader(stories, request);
  authorization.headers.set("X-NJC-Compatibility-Profile", profile);

  return NextResponse.json({
    data,
    meta: {
      apiVersion: "1",
      count: data.length,
      limit,
      category: category ?? null,
      query: query ?? null,
      compatibilityProfile: profile,
    },
  }, { headers: authorization.headers });
}
