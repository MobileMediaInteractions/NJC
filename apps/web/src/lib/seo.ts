import { brandAssets } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/origin";
import { siteConfig } from "@/lib/site";
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

const publisher = {
  "@type": "NewsMediaOrganization",
  "@id": `${getSiteOrigin()}/#publisher`,
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  url: getSiteOrigin(),
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl(brandAssets.appIcon),
  },
  description: siteConfig.description,
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Middlesex County, New Jersey",
  },
  publishingPrinciples: absoluteUrl("/standards"),
  ethicsPolicy: absoluteUrl("/standards"),
  correctionsPolicy: absoluteUrl("/standards"),
};

const website = {
  "@type": "WebSite",
  "@id": `${getSiteOrigin()}/#website`,
  url: getSiteOrigin(),
  name: siteConfig.name,
  alternateName: [siteConfig.shortName, "New Jersey Courier"],
  description: siteConfig.description,
  inLanguage: "en-US",
  publisher: { "@id": `${getSiteOrigin()}/#publisher` },
};

export function homePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      publisher,
      website,
    ],
  };
}

export function storyPageJsonLd(story: Story) {
  const storyUrl = story.canonicalUrl || absoluteUrl(`/story/${story.slug}`);
  const categoryUrl = absoluteUrl(`/category/${story.category}`);
  const wordCount = story.body.join(" ").trim().split(/\s+/).filter(Boolean).length;

  return {
    "@context": "https://schema.org",
    "@graph": [
      publisher,
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

export function categoryPageJsonLd(slug: string, label: string, description: string) {
  const url = absoluteUrl(`/category/${slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      website,
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
