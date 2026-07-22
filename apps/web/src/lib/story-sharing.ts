const xPostIntentUrl = "https://x.com/intent/post";

type StoryShareInput = {
  canonicalUrl?: string;
  headline: string;
  siteOrigin: string;
  slug: string;
  updatedAt?: string;
};

function getVersionToken(updatedAt: string | undefined) {
  if (!updatedAt) return undefined;
  const timestamp = Date.parse(updatedAt);
  return Number.isFinite(timestamp) ? timestamp.toString(36) : undefined;
}

export function getStorySocialImageUrl({ siteOrigin, slug, updatedAt }: Pick<StoryShareInput, "siteOrigin" | "slug" | "updatedAt">) {
  const imageUrl = new URL(`/social/story/${encodeURIComponent(slug)}/image`, siteOrigin);
  const version = getVersionToken(updatedAt);
  if (version) imageUrl.searchParams.set("v", version);
  return imageUrl.toString();
}

export function getStoryShareLinks({ canonicalUrl, headline, siteOrigin, slug, updatedAt }: StoryShareInput) {
  let articleUrl: URL;

  try {
    articleUrl = new URL(canonicalUrl || `/story/${slug}`, siteOrigin);
  } catch {
    articleUrl = new URL(`/story/${slug}`, siteOrigin);
  }

  const shareUrl = new URL(articleUrl);
  const version = getVersionToken(updatedAt);
  if (version) shareUrl.searchParams.set("share", version);

  const intent = new URL(xPostIntentUrl);
  intent.searchParams.set("text", `${headline}\n\n${shareUrl.toString()}`);

  const email = new URLSearchParams({
    subject: headline,
    body: `${headline}\n\n${shareUrl.toString()}`,
  });

  return {
    articleUrl: articleUrl.toString(),
    emailUrl: `mailto:?${email.toString()}`,
    shareUrl: shareUrl.toString(),
    xUrl: intent.toString(),
  };
}

export function getStoryShareUrl(input: StoryShareInput) {
  return getStoryShareLinks(input).xUrl;
}
