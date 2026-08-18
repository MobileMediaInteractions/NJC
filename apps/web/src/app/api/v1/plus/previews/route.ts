import { NextResponse } from "next/server";
import { getAccountIdentity } from "@/lib/auth";
import { listAccountPreviews } from "@/lib/njc-plus-preview";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";

export async function GET() {
  const user = await getAccountIdentity();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
  if (!(await isNjcPlusFeatureEnabled("njc_plus_preview_club"))) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const rows = await listAccountPreviews(user.clerkId);
  return NextResponse.json({ data: rows.map(({ content, invitation, preview }) => ({ id: content.id, slug: content.slug, title: content.title, summary: content.summary, imageUrl: content.imageUrl, imageAlt: content.imageAlt, kind: content.kind, durationMs: content.durationMs, status: invitation.status, expiresAt: invitation.expiresAt ?? preview.expiresAt, feedbackSubmitted: invitation.status === "feedback_submitted", playbackUrl: `/api/v1/plus/previews/${encodeURIComponent(content.slug)}/media` })), meta: { apiVersion: "1", private: true } }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
}
