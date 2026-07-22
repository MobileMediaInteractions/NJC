import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { canViewNewsTips, tipStatusInput } from "@/lib/newsroom-tips";

const tipId = z.uuid();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const parsedId = tipId.safeParse((await context.params).id);
  const parsedBody = tipStatusInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedId.success || !parsedBody.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Choose a valid tip status" } },
      { status: 400 },
    );
  }

  try {
    const [current] = await getDb()
      .select({ id: newsTips.id, status: newsTips.status })
      .from(newsTips)
      .where(eq(newsTips.id, parsedId.data))
      .limit(1);
    if (!current) {
      return NextResponse.json(
        { error: { code: "not_found", message: "News tip not found" } },
        { status: 404 },
      );
    }
    const [updated] = await getDb()
      .update(newsTips)
      .set({ status: parsedBody.data.status })
      .where(eq(newsTips.id, current.id))
      .returning();
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "news_tip.status_changed",
      request,
      metadata: {
        tipId: current.id,
        from: current.status,
        to: parsedBody.data.status,
      },
    });
    revalidatePath("/studio", "layout");
    revalidatePath("/studio/tips");
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Studio news tip update failed", {
      tipId: parsedId.data,
      actorId: viewer.id,
      error,
    });
    return NextResponse.json(
      { error: { code: "update_failed", message: "The news tip could not be updated" } },
      { status: 500 },
    );
  }
}
