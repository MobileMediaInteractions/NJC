const xPostIntentUrl = "https://x.com/intent/post";

type StoryShareInput = {
  canonicalUrl?: string;
  headline: string;
  siteOrigin: string;
  slug: string;
};

export function getStoryShareLinks({ canonicalUrl, headline, siteOrigin, slug }: StoryShareInput) {
  let articleUrl: URL;

  try {
    articleUrl = new URL(canonicalUrl || `/story/${slug}`, siteOrigin);
  } catch {
    articleUrl = new URL(`/story/${slug}`, siteOrigin);
  }

  const intent = new URL(xPostIntentUrl);
  intent.searchParams.set("text", `${headline}\n\n${articleUrl.toString()}`);

  const email = new URLSearchParams({
    subject: headline,
    body: `${headline}\n\n${articleUrl.toString()}`,
  });

  return {
    articleUrl: articleUrl.toString(),
    emailUrl: `mailto:?${email.toString()}`,
    xUrl: intent.toString(),
  };
}

export function getStoryShareUrl(input: StoryShareInput) {
  return getStoryShareLinks(input).xUrl;
}
