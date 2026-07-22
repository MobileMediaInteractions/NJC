import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { tipInput } from "@/lib/newsroom-tips";

export async function POST(request: Request) {
  const parsed = tipInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the required tip fields", details: parsed.error.flatten() } }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "News tip intake requires DATABASE_URL" } }, { status: 503 });
  try {
    const [tip] = await getDb()
      .insert(newsTips)
      .values({
        name: parsed.data.name || null,
        email: parsed.data.email || null,
        subject: parsed.data.subject,
        body: parsed.data.body,
        source: "website",
        status: "new",
      })
      .returning({ id: newsTips.id, createdAt: newsTips.createdAt });
    if (!tip) throw new Error("Tip insert returned no record");
    return NextResponse.json(
      { data: tip, meta: { apiVersion: "1", status: "received" } },
      { status: 201 },
    );
  } catch (error) {
    console.error("News tip persistence failed", error);
    return NextResponse.json(
      {
        error: {
          code: "save_failed",
          message: "The tip could not be saved. Please try again.",
        },
      },
      { status: 500 },
    );
  }
}
