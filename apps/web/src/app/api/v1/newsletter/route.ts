import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsletterSubscribers } from "@harborline/backend/schema";

const subscriptionSchema = z.object({
  email: z.email(),
  lists: z.array(z.enum(["daily-brief", "weather-alerts", "weekend"])).min(1).default(["daily-brief"]),
});

export async function POST(request: Request) {
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Enter a valid email address", details: parsed.error.flatten() } }, { status: 400 });

  const subscription = { email: parsed.data.email.toLowerCase(), lists: parsed.data.lists };
  let databasePersisted = false;
  let webhookPersisted = false;

  if (hasDatabase()) {
    try {
      await getDb().insert(newsletterSubscribers).values(subscription).onConflictDoUpdate({ target: newsletterSubscribers.email, set: { lists: subscription.lists, isActive: true } });
      databasePersisted = true;
    } catch (error) {
      console.error("Newsletter database persistence failed", error);
    }
  }

  if (process.env.NEWSLETTER_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.NEWSLETTER_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription) });
      if (!response.ok) throw new Error(`Newsletter webhook returned ${response.status}`);
      webhookPersisted = true;
    } catch (error) {
      console.error("Newsletter webhook persistence failed", error);
    }
  }

  if (!databasePersisted && !webhookPersisted) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "Newsletter signup is temporarily unavailable. Please try again later." } }, { status: 503 });
  }

  return NextResponse.json({ data: { subscribed: true, email: subscription.email, lists: subscription.lists }, meta: { apiVersion: "1", persisted: true, providers: { database: databasePersisted, webhook: webhookPersisted } } }, { status: 201 });
}
