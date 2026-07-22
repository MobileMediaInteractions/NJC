import { brandAssets } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/origin";
import type { SiteConfiguration } from "@/lib/site-settings";
import type { Story } from "@/lib/types";

export function isSearchIndexingEnabled() {
  return process.env.NEXT_PUBLIC_SEO_INDEXING_ENABLED === "true";
}

export function absoluteUrl(pathOrUrl: string) {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return new URL(pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`, getSiteOrigin()).toString();
  }
}

function publisherFor(publication: SiteConfiguration["publication"]) {
  return {
    "@type": "NewsMediaOrganization",
    "@id": `${getSiteOrigin()}/#publisher`,
    name: publication.name,
    alternateName: publication.shortName,
    url: getSiteOrigin(),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(brandAssets.appIcon),
    },
    description: publication.description,
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${publication.region}, ${publication.state}`,
    },
    publishingPrinciples: absoluteUrl("/standards"),
    ethicsPolicy: absoluteUrl("/standards"),
    correctionsPolicy: absoluteUrl("/standards"),
  };
}

function websiteFor(publication: SiteConfiguration["publication"]) {
  return {
    "@type": "WebSite",
    "@id": `${getSiteOrigin()}/#website`,
    url: getSiteOrigin(),
    name: publication.name,
    alternateName: publication.shortName,
    description: publication.description,
    inLanguage: "en-US",
    publisher: { "@id": `${getSiteOrigin()}/#publisher` },
  };
}

export function homePageJsonLd(publication: SiteConfiguration["publication"]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      publisherFor(publication),
      websiteFor(publication),
    ],
  };
}

export function storyPageJsonLd(story: Story, publication: SiteConfiguration["publication"]) {
  const storyUrl = story.canonicalUrl || absoluteUrl(`/story/${story.slug}`);
  const categoryUrl = absoluteUrl(`/category/${story.category}`);
  const wordCount = story.body.join(" ").trim().split(/\s+/).filter(Boolean).length;

  return {
    "@context": "https://schema.org",
    "@graph": [
      publisherFor(publication),
      {
        "@type": "NewsArticle",
        "@id": `${storyUrl}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": storyUrl },
        url: storyUrl,
        headline: story.headline,
        description: story.seoDescription || story.dek,
        image: [absoluteUrl(story.image)],
        datePublished: story.publishedAt,
        dateModified: story.updatedAt || story.publishedAt,
        author: {
          "@type": "Person",
          name: story.author.name,
        },
        publisher: { "@id": `${getSiteOrigin()}/#publisher` },
        articleSection: story.categoryLabel,
        keywords: story.tags.join(", "),
        wordCount,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        dateline: story.location,
        spatialCoverage: {
          "@type": "Place",
          name: story.location,
          address: {
            "@type": "PostalAddress",
            addressRegion: "NJ",
            addressCountry: "US",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: getSiteOrigin() },
          { "@type": "ListItem", position: 2, name: story.categoryLabel, item: categoryUrl },
          { "@type": "ListItem", position: 3, name: story.headline, item: storyUrl },
        ],
      },
    ],
  };
}

export function categoryPageJsonLd(slug: string, label: string, description: string, publication: SiteConfiguration["publication"]) {
  const url = absoluteUrl(`/category/${slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      websiteFor(publication),
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name: label,
        description,
        inLanguage: "en-US",
        isPartOf: { "@id": `${getSiteOrigin()}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: getSiteOrigin() },
          { "@type": "ListItem", position: 2, name: label, item: url },
        ],
      },
    ],
  };
}
