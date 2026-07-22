const xPostIntentUrl = "https://x.com/intent/post";

type StoryShareInput = {
  canonicalUrl?: string;
  headline: string;
  siteOrigin: string;
  slug: string;
};

export function getStoryShareUrl({ canonicalUrl, headline, siteOrigin, slug }: StoryShareInput) {
  let articleUrl: URL;

  try {
    articleUrl = new URL(canonicalUrl || `/story/${slug}`, siteOrigin);
  } catch {
    articleUrl = new URL(`/story/${slug}`, siteOrigin);
  }

  const intent = new URL(xPostIntentUrl);
  intent.searchParams.set("text", `${headline}\n\n${articleUrl.toString()}`);
  return intent.toString();
}
