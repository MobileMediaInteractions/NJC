import { and, asc, desc, eq, gt, ilike, isNull, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatAttachments, employeeChatChannels, employeeChatMembers, employeeChatMessages, employeeNotifications } from "@harborline/backend/schema";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid, sanitizeEmployeeMessage } from "@/lib/employee-chat";
import { sendEmployeePush } from "@/lib/employee-push";

const input = z.object({
  body: z.string().max(8000),
  replyToId: z.string().uuid().optional(),
  mentions: z.array(z.string().trim().min(1).max(200)).max(25).default([]),
  attachmentIds: z.array(z.string().uuid()).max(10).default([]),
  clientId: z.string().uuid().optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Internal-chat access is required" } }, { status: 403 });
  const { id } = await context.params;
  if (!isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const after = url.searchParams.get("after");
  const search = url.searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
  const conditions = [eq(employeeChatMessages.channelId, id)];
  if (before && !Number.isNaN(Date.parse(before))) conditions.push(lt(employeeChatMessages.createdAt, new Date(before)));
  if (after && !Number.isNaN(Date.parse(after))) conditions.push(gt(employeeChatMessages.createdAt, new Date(after)));
  if (search) conditions.push(ilike(employeeChatMessages.body, `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
  const rows = await getDb().select().from(employeeChatMessages).where(and(...conditions)).orderBy(after ? asc(employeeChatMessages.createdAt) : desc(employeeChatMessages.createdAt)).limit(limit);
  const data = after ? rows : rows.reverse();
  return NextResponse.json({ data, meta: { apiVersion: "1", nextCursor: data.at(-1)?.createdAt?.toISOString() ?? null } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Message permission is required" } }, { status: 403 });
  const { id } = await context.params;
  const channel = isValidEmployeeUuid(id) ? await getAuthorizedEmployeeChannel(viewer, id, "write") : null;
  if (!channel) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  const body = parsed.success ? sanitizeEmployeeMessage(parsed.data.body) : "";
  if (!parsed.success || (!body && !parsed.data.attachmentIds.length)) return NextResponse.json({ error: { code: "invalid_request", message: "Write a message or attach a supported file" } }, { status: 400 });
  const db = getDb();
  const [rate] = await db.select({ count: sql<number>`count(*)::int` }).from(employeeChatMessages).where(and(eq(employeeChatMessages.authorClerkId, viewer.id), gt(employeeChatMessages.createdAt, new Date(Date.now() - 60_000))));
  if (rate.count >= 30) return NextResponse.json({ error: { code: "rate_limited", message: "Wait before sending more messages" } }, { status: 429, headers: { "Retry-After": "60" } });
  if (parsed.data.replyToId) {
    const [reply] = await db.select({ id: employeeChatMessages.id }).from(employeeChatMessages).where(and(eq(employeeChatMessages.id, parsed.data.replyToId), eq(employeeChatMessages.channelId, id), isNull(employeeChatMessages.deletedAt))).limit(1);
    if (!reply) return NextResponse.json({ error: { code: "invalid_reply", message: "The referenced message is unavailable" } }, { status: 400 });
  }
  const attachments = parsed.data.attachmentIds.length ? await db.select().from(employeeChatAttachments).where(and(eq(employeeChatAttachments.channelId, id), eq(employeeChatAttachments.uploaderClerkId, viewer.id), isNull(employeeChatAttachments.messageId), or(...parsed.data.attachmentIds.map((attachmentId) => eq(employeeChatAttachments.id, attachmentId))))) : [];
  if (attachments.length !== parsed.data.attachmentIds.length) return NextResponse.json({ error: { code: "invalid_attachment", message: "One or more attachments are unavailable" } }, { status: 400 });
  const requestedMentions = [...new Set(parsed.data.mentions)].filter((value) => value !== viewer.id);
  const mentionMembers = requestedMentions.length ? await db.select({ userClerkId: employeeChatMembers.userClerkId }).from(employeeChatMembers).where(and(eq(employeeChatMembers.channelId, id), isNull(employeeChatMembers.leftAt), or(...requestedMentions.map((userId) => eq(employeeChatMembers.userClerkId, userId))))) : [];
  const mentions = mentionMembers.map((member) => member.userClerkId);
  const [message] = await db.insert(employeeChatMessages).values({ id: parsed.data.clientId, channelId: id, authorClerkId: viewer.id, authorName: viewer.name, body, replyToId: parsed.data.replyToId, mentions }).returning();
  if (attachments.length) await db.update(employeeChatAttachments).set({ messageId: message.id }).where(or(...attachments.map((attachment) => eq(employeeChatAttachments.id, attachment.id))));
  await db.update(employeeChatChannels).set({ updatedAt: new Date() }).where(eq(employeeChatChannels.id, id));
  const directRecipients = channel.kind === "direct"
    ? (await db.select({ userClerkId: employeeChatMembers.userClerkId }).from(employeeChatMembers).where(and(eq(employeeChatMembers.channelId, id), isNull(employeeChatMembers.leftAt))))
      .map((member) => member.userClerkId)
      .filter((userId) => userId !== viewer.id)
    : [];
  const notificationRecipients = [...new Set([...mentions, ...directRecipients])];
  if (notificationRecipients.length) {
    const destination = `njcourier-employee:///v1/chat/channel/${id}`;
    await db.insert(employeeNotifications).values(notificationRecipients.map((recipientClerkId) => {
      const mentioned = mentions.includes(recipientClerkId);
      return { recipientClerkId, kind: mentioned ? "mention" : "direct_message", title: mentioned ? `Mention from ${viewer.name}` : `New message from ${viewer.name}`, body: mentioned ? "You were mentioned in an internal conversation." : "Open Team Chat to view this private message.", destination };
    }));
    await sendEmployeePush(notificationRecipients, `New team message from ${viewer.name}`, destination);
  }
  await writeEmployeeAudit(request, viewer, "chat.message.created", { type: "message", id: message.id }, { channelId: id, attachmentCount: attachments.length });
  return NextResponse.json({ data: message, meta: { apiVersion: "1" } }, { status: 201 });
}
