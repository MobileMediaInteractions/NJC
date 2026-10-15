import { storyIdFromShortCode } from "@/lib/story-short-code";

type PublishedDestination = { slug: string; updatedAt: Date };
type Dependencies = {
  siteOrigin: () => string;
  findPublishedStory: (id: string) => Promise<PublishedDestination | null>;
  onError: (error: unknown) => void;
};
const trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

/** Lookup receives an exact UUID, never user-supplied SQL, paths or destinations. */
export function createStoryShortLinkHandler(dependencies: Dependencies) {
  return async function handle(request: Request, context: { params: Promise<{ code: string }> }) {
    const { code } = await context.params;
    const id = storyIdFromShortCode(code);
    if (!id) return new Response(null, { status: 404, headers: noStore });
    try {
      const story = await dependencies.findPublishedStory(id);
      if (!story) return new Response(null, { status: 404, headers: noStore });
      const destination = new URL(`/story/${encodeURIComponent(story.slug)}`, dependencies.siteOrigin());
      // Keep the shared URL compact; refresh the long destination's crawler token.
      destination.searchParams.set("share", story.updatedAt.getTime().toString(36));
      const incoming = new URL(request.url);
      for (const key of trackingKeys) {
        const value = incoming.searchParams.get(key);
        if (value && value.length <= 256) destination.searchParams.set(key, value);
      }
      // Never cache a redirect past an unpublish/delete or a slug correction.
      return new Response(null, { status: 307, headers: { ...noStore, Location: destination.toString() } });
    } catch (error) {
      dependencies.onError(error);
      return new Response(null, { status: 503, headers: { ...noStore, "Retry-After": "60" } });
    }
  };
}
