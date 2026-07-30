import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  notificationCampaigns,
  notificationDeliveries,
} from "@harborline/backend/schema";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";

const pushEventSchema = z.object({
  event: z.literal("opened"),
  campaignId: z.uuid(),
  deliveryId: z.uuid(),
}).strict();

export async function POST(request: Request) {
  const access = await authorizeReaderApiRequest(request);
  if (access.response) return access.response;
  if (!hasDatabase()) {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(access.headers),
    });
  }
  const parsed = pushEventSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: { code: "invalid_event", message: "A valid notification event is required" } },
      {
        status: 400,
        headers: responseHeaders(access.headers),
      },
    );
  }

  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [opened] = await tx
      .update(notificationDeliveries)
      .set({ openedAt: now })
      .where(and(
        eq(notificationDeliveries.id, parsed.data.deliveryId),
        eq(notificationDeliveries.campaignId, parsed.data.campaignId),
        isNull(notificationDeliveries.openedAt),
      ))
      .returning({ id: notificationDeliveries.id });
    if (!opened) return;
    await tx
      .update(notificationCampaigns)
      .set({
        openedCount: sql`${notificationCampaigns.openedCount} + 1`,
      })
      .where(eq(notificationCampaigns.id, parsed.data.campaignId));
  });

  return new Response(null, {
    status: 204,
    headers: responseHeaders(access.headers),
  });
}

function responseHeaders(existing?: Headers) {
  const headers = new Headers(existing);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return headers;
}
