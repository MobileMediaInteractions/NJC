# Article short links

Article sharing now uses `https://www.thejerseycourier.com/s/<code>` when the
configured site origin is the production domain. The origin continues to come
from the existing `getSiteOrigin()` environment resolution; no new domain or
external shortening service is required.

## Identity and compatibility

The case-sensitive, 22-character alphanumeric code losslessly encodes the article's
existing 128-bit UUID in base 62. It is not a truncated hash or an authorization
token. Four-character random codes would need collision management and a persistent
allocation table; this implementation keeps every existing article addressable
without schema changes, backfills or public-page database writes. Preserve article
IDs during restores/imports if short URLs must continue to work.

Both legacy and V2 story pages supply the article ID to their shared sharing
helper. X posts, email, device sharing and Copy link use the same short URL.
Saving articles and ordinary navigation still use the full story URL. Old callers
without a valid UUID retain the existing long-link fallback.

GET and HEAD resolve the UUID using the existing Postgres primary-key index and
redirect to the **current** `/story/<slug>` on the configured site origin. Thus
headline/slug corrections do not change the short URL. Only published stories
whose publication date is not in the future (or legacy published records without
a date) are eligible. Draft, review, scheduled, archived, unpublished and deleted
stories return 404. No preview or staff access is granted by possession of a code.

## Redirect behavior and safety

- A noncached 307 redirect rechecks publication on every request. Permanent/browser
  caching would keep old slugs and could bypass an unpublish check.
- The destination is constructed by trusted code, not from a caller-supplied URL,
  request Host header, or an external canonical-URL override.
- Only bounded `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and
  `utm_term` parameters pass through. Unknown query parameters are discarded.
- The destination receives the existing `share` revision token for social crawler
  freshness; the short URL itself stays stable and has no version query string.
- Malformed/overflowing codes are rejected before database access. Missing database
  configuration or lookup failures return a noncached 503 with `Retry-After: 60`.
- Existing article metadata, canonical URLs, social images, sitemap entries and
  long URLs are unchanged. Crawlers can follow short links to the canonical page;
  short URLs are not separately added to the sitemap. Social networks may still
  retain their own cached previews.
- The redirect does not write click counters or emit an extra page-view event;
  normal destination-page analytics retain consent and avoid double counting.

The route uses standard [Next.js route-handler redirects](https://nextjs.org/docs/app/api-reference/functions/next-response).
No dependencies, paid services, migrations or additional environment variables
were added. This covers website article sharing, not yet native app share sheets.

## Verification

Run `tsx --test tests/story-short-links.test.ts tests/story-sharing.test.ts` from
`apps/web`. Tests cover 1,000 UUID round trips, boundaries, malformed codes,
published lookups, updated slugs, GET/HEAD, no-store responses, attribution,
open-redirect rejection, missing resources, outages and share-link compatibility.
The route's publication query is checked explicitly; a real production database
round trip and social-network unfurls still require deployed validation.

October 15 release validation: all 23 focused short-link, sharing, saved-story
and SEO tests passed in the isolated staged release. Targeted ESLint and the
production Next.js build (including TypeScript) also passed without production
database credentials.
