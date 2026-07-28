import { and, desc, ilike, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { getDistributionManager } from "@/lib/distribution";

export async function GET(request: Request) {
  const manager = await getDistributionManager();
  if (!manager || !hasDatabase()) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const rows = await getDb()
    .select({
      id: stories.id,
      headline: stories.headline,
      status: stories.status,
      updatedAt: stories.updatedAt,
    })
    .from(stories)
    .where(
      and(
        inArray(stories.status, ["draft", "review", "scheduled"]),
        query
          ? ilike(stories.headline, `%${query.slice(0, 120)}%`)
          : undefined,
      ),
    )
    .orderBy(desc(stories.updatedAt))
    .limit(20);
  return NextResponse.json(
    {
      data: rows,
      meta: { apiVersion: "1" },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
