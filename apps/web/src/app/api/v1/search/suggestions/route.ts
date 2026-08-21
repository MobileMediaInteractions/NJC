import { NextResponse } from "next/server";
import { getPublishedStories } from "@/lib/content";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";
import {
  buildPublicSearchSuggestionGroups,
  publicSearchSuggestionCount,
  publicSearchSuggestionQuerySchema,
} from "@/lib/public-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeReaderApiRequest(request);
  if (authorization.response) return authorization.response;
  authorization.headers.set("X-Content-Type-Options", "nosniff");

  const parsed = publicSearchSuggestionQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_search_query",
          message: "Enter between 2 and 120 characters to see suggestions",
        },
      },
      {
        status: 400,
        headers: authorization.headers,
      },
    );
  }

  try {
    const stories = await getPublishedStories({
      excludeNoIndex: true,
      limit: 100,
      query: parsed.data.q,
    });
    const groups = buildPublicSearchSuggestionGroups(
      stories,
      parsed.data.q,
      parsed.data.limit,
    );

    return NextResponse.json(
      {
        data: groups,
        meta: {
          apiVersion: "1",
          count: publicSearchSuggestionCount(groups),
          query: parsed.data.q,
          limitPerGroup: parsed.data.limit,
        },
      },
      {
        headers: authorization.headers,
      },
    );
  } catch (error) {
    console.error("Public search suggestions failed", error);
    return NextResponse.json(
      {
        error: {
          code: "search_unavailable",
          message: "Search suggestions are temporarily unavailable",
        },
      },
      {
        status: 503,
        headers: authorization.headers,
      },
    );
  }
}
