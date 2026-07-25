import { createFaviconResponse } from "@/lib/favicon";

export const dynamic = "force-static";

export function GET() {
  return createFaviconResponse();
}
