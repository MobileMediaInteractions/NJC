# Link in Bio

The Courier's social landing page is served at
`https://links.thejerseycourier.com`. The existing IONOS CNAME and Vercel TLS
certificate are reused; this feature replaces the hostname's former canonical
publication redirect.

![The Courier Link in Bio landing page](screenshots/product/link-in-bio.jpg)

## Editorial workflow

Authorized administrators, editors, and producers manage the page in Studio at
`/studio/links` or `https://studio.thejerseycourier.com/links`.

- Only a story already published in the production database can be selected.
- The story ID, public slug, headline, image, section, and destination are
  populated by the server; arbitrary URLs cannot be entered.
- A story can appear only once. Staff may override its display headline without
  changing the article headline.
- Staff can reorder entries, hide them, remove them from the social page, or set
  optional start and end times. Removing an entry does not delete the story.
- Every create, update, reorder, and remove operation is written to the employee
  audit log.
- Link in Bio data is included in portable database exports.

The public master switch is **Studio → Configuration → Features → Link in
Bio**. Its Studio workspace has a separate configurable module switch. Turning
off the public feature redirects the hostname to the canonical publication but
does not delete its curated lineup.

## Social attribution and redirects

Studio provides profile URLs for Instagram, Facebook, X, TikTok, YouTube,
Threads, LinkedIn, and Bluesky. For example:

```text
https://links.thejerseycourier.com?source=instagram
```

The public page carries that allowlisted source into each first-party article
redirect. Destinations are generated only from the linked published story and
receive:

```text
utm_source=<allowlisted platform or link_in_bio>
utm_medium=social
utm_campaign=link_in_bio
```

Unknown source values become `link_in_bio`; they are never copied into a URL.
Every successful redirect increments the entry's Studio-visible count. Hidden,
not-yet-started, expired, unpublished, removed, or malformed entries cannot
redirect to an article.

## Search and security

- The Link in Bio page is deliberately `noindex` so it does not compete with
  canonical story pages in search results.
- The browser never submits an arbitrary destination URL.
- Mutations require a current Studio identity and publisher role, and every
  request is validated server-side.
- Link pages are denied framing and retain an origin-only referrer policy.
- The independent Status service monitors the hostname as a live first-party
  page rather than as a reserved redirect.
