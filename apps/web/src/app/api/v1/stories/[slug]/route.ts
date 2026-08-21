import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/content";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";
import { projectStoryForReader, readerCompatibilityProfile } from "@/lib/reader-api-compatibility";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const authorization = await authorizeReaderApiRequest(request);
  if (authorization.response) return authorization.response;
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return NextResponse.json({ error: { code: "not_found", message: "Story not found" } }, { status: 404, headers: authorization.headers });
  const profile = readerCompatibilityProfile(request);
  authorization.headers.set("X-NJC-Compatibility-Profile", profile);
  return NextResponse.json({ data: projectStoryForReader(story, request, profile), meta: { apiVersion: "1", compatibilityProfile: profile } }, { headers: authorization.headers });
}
