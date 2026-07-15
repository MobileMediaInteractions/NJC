# Search visibility and news SEO

The Courier’s SEO system is designed to make verified reporting easy to crawl, understand and share. It cannot guarantee a particular ranking. Search position also depends on reporting quality, topical authority, competition, links, reputation, speed and reader usefulness.

## Launch safety

The repository currently contains fictional preview stories. Search indexing is therefore disabled by default:

```dotenv
NEXT_PUBLIC_SEO_INDEXING_ENABLED=false
```

Do not enable indexing until demo reporting, authors, dates and claims have been replaced with sourced newsroom content. For launch, set the value to `true` in the Vercel production environment only. Keep it false for preview deployments.

## Technical system

- Canonical URLs resolve through the Vercel production alias now and a configured custom domain later.
- Every published story receives unique title, description, author, section, publication/update dates, keywords, social-card metadata and large-image preview permissions.
- Story pages emit `NewsArticle` and `BreadcrumbList` JSON-LD. The homepage emits `NewsMediaOrganization` and `WebSite` JSON-LD. Section pages emit `CollectionPage` and breadcrumb data.
- `/sitemap.xml` lists indexable sections and up to 49,900 published stories while staying below the protocol’s 50,000-URL limit.
- `/news-sitemap.xml` lists up to 1,000 indexable articles published in the prior 48 hours.
- `/feed.xml` provides an RSS 2.0 feed and is advertised from page metadata.
- `/robots.txt` blocks APIs, Studio, account, pairing and internal-search routes when indexing is enabled. Before launch it blocks the entire site.
- API and Studio responses also carry `X-Robots-Tag` headers.
- Studio editors may override an SEO title and description, declare an external canonical URL, or exclude an article from search. Defaults remain the recommended path.

## Production activation

1. Deploy the web project and choose its stable `*.vercel.app` production alias.
2. Replace all fictional preview content and complete editorial/legal launch review.
3. Add the site to Google Search Console and Bing Webmaster Tools.
4. Set `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` from those services.
5. Set `NEXT_PUBLIC_SEO_INDEXING_ENABLED=true` in Vercel Production only and redeploy.
6. Confirm `/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml` and `/feed.xml` use the production origin.
7. Submit `sitemap.xml` and `news-sitemap.xml` in Search Console.
8. Validate representative stories with Google’s Rich Results Test and URL Inspection tool.
9. When a custom domain is purchased, set `NEXT_PUBLIC_SITE_URL`, redirect the old hostname, verify both properties and follow Google’s site-move process.

Google describes sitemap submission as a discovery hint rather than an indexing guarantee. Its article guidance recommends accurate visible dates, author information and matching structured data. See [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article), [news sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap), [Search Essentials](https://developers.google.com/search/docs/essentials) and [site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## Editorial ranking plan

Technical markup makes content eligible; it does not create authority. The newsroom should:

- publish original reporting with named authors, primary documents, precise locations and clear update/correction notes;
- build durable county, municipality, school-district, election and high-school-team topic pages;
- link breaking stories to explainers and prior coverage with descriptive anchor text;
- answer specific local questions better than statewide or national competitors;
- earn citations and links from public agencies, schools, libraries, community organizations and other reputable publishers;
- avoid mass-produced town pages, rewritten press releases, misleading dates and generic AI summaries;
- keep headlines descriptive and readable rather than repeatedly stuffing location keywords;
- maintain fast mobile rendering, accessible images and stable layouts.

## Measurement

Review these every week after launch:

- valid indexed pages and sitemap processing errors;
- impressions, clicks, click-through rate and average position by query and page;
- branded versus non-branded searches;
- Middlesex, municipality and topic-level query groups;
- Discover and Google News visibility when available;
- Core Web Vitals and mobile usability;
- stories with impressions but weak click-through rates;
- pages losing traffic after material updates or URL changes.

Ranking in the first few results should be treated as a query-by-query outcome. Early targets should be narrow, high-intent searches such as a municipality plus a council issue, school name plus budget, or team name plus tournament coverage—not the broad phrase “New Jersey news.”
