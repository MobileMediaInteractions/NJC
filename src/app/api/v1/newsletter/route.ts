import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { newsletterSubscribers } from "@/db/schema";

const subscriptionSchema = z.object({
  email: z.email(),
  lists: z.array(z.enum(["daily-brief", "weather-alerts", "weekend"])).min(1).default(["daily-brief"]),
});

export async function POST(request: Request) {
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Enter a valid email address", details: parsed.error.flatten() } }, { status: 400 });

  if (hasDatabase()) {
    await getDb().insert(newsletterSubscribers).values({ email: parsed.data.email.toLowerCase(), lists: parsed.data.lists }).onConflictDoUpdate({ target: newsletterSubscribers.email, set: { lists: parsed.data.lists, isActive: true } });
  }

  if (process.env.NEWSLETTER_WEBHOOK_URL) {
    await fetch(process.env.NEWSLETTER_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }).catch((error) => console.error("Newsletter webhook failed", error));
  }

  return NextResponse.json({ data: { subscribed: true, email: parsed.data.email, lists: parsed.data.lists }, meta: { apiVersion: "1", persisted: hasDatabase() } }, { status: 201 });
}
