import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/content";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return NextResponse.json({ error: { code: "not_found", message: "Story not found" } }, { status: 404 });
  return NextResponse.json({ data: story, meta: { apiVersion: "1" } });
}
