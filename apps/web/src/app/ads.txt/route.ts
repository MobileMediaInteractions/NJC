import { getSiteConfiguration, normalizePublisherId } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const configuration = await getSiteConfiguration();
  const publisherId = normalizePublisherId(configuration.advertising.publisherId).replace(/^ca-/, "");
  const body = configuration.advertising.adsTxtEnabled && publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# No advertising sellers are currently authorized.\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
