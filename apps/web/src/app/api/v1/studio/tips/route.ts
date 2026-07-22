import { and, count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canViewNewsTips } from "@/lib/newsroom-tips";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  }
  if (!canViewNewsTips(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "News tip access is restricted" } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured" } },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const conditions = status === "new" || status === "reviewing" || status === "closed"
    ? eq(newsTips.status, status)
    : undefined;

  try {
    const [[summary], rows] = await Promise.all([
      getDb()
        .select({ value: count() })
        .from(newsTips)
        .where(eq(newsTips.status, "new")),
      getDb()
        .select()
        .from(newsTips)
        .where(and(conditions))
        .orderBy(desc(newsTips.createdAt))
        .limit(200),
    ]);
    return NextResponse.json({
      data: rows,
      meta: {
        apiVersion: "1",
        newCount: Number(summary?.value ?? 0),
      },
    });
  } catch (error) {
    console.error("Studio news tip lookup failed", error);
    return NextResponse.json(
      { error: { code: "lookup_failed", message: "News tips could not be loaded" } },
      { status: 500 },
    );
  }
}
