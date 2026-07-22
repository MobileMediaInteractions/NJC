import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/content";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const authorization = await authorizeReaderApiRequest(request);
  if (authorization.response) return authorization.response;
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return NextResponse.json({ error: { code: "not_found", message: "Story not found" } }, { status: 404, headers: authorization.headers });
  return NextResponse.json({ data: story, meta: { apiVersion: "1" } }, { headers: authorization.headers });
}
