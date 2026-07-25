# Production subdomains

The Courier uses one canonical public site, one database-backed application
deployment and one separately deployable static asset origin.

| Host | Vercel project | Behavior |
| --- | --- | --- |
| `www.thejerseycourier.com` | `njc-web` | Canonical public publication |
| `studio.thejerseycourier.com` | `njc-web` | Redirects `/` to `/studio`; Studio authentication and authorization remain enforced by Clerk and the API |
| `api.thejerseycourier.com` | `njc-web` | Clean `/v1/*` and `/developer/*` aliases rewrite to the existing versioned API routes |
| `cdn.thejerseycourier.com` | dedicated CDN project rooted at `apps/cdn` | Immutable public brand and editorial assets; never private newsroom material |
| `plus.thejerseycourier.com` | `njc-web` | Temporary redirect to the matching path on the canonical site until NJC+ ships |

DNS labels cannot contain `+`, so the public hostname for NJC+ is `plus`.
Its redirect is deliberately temporary rather than permanent, preventing
browsers from caching a 308 after NJC+ becomes a standalone product.

## Web project environment

Set these values for Production:

```dotenv
NEXT_PUBLIC_SITE_URL=https://www.thejerseycourier.com
NEXT_PUBLIC_STUDIO_URL=https://studio.thejerseycourier.com/studio
NEXT_PUBLIC_STUDIO_HOST=studio.thejerseycourier.com
NEXT_PUBLIC_API_HOST=api.thejerseycourier.com
NEXT_PUBLIC_PLUS_HOST=plus.thejerseycourier.com
NEXT_PUBLIC_ASSET_ORIGIN=https://cdn.thejerseycourier.com
```

The web UI may continue using same-origin API calls. The API subdomain exists
for official applications and documented integrations; it does not weaken API
keys, rate limits, Clerk authorization or per-route permission checks.

## CDN project

Create a separate Vercel project from the same repository with:

- Root Directory: `apps/cdn`
- Framework Preset: Other
- Production hostname: `cdn.thejerseycourier.com`

Verify the manifest and an immutable asset before switching the web project:

```text
https://cdn.thejerseycourier.com/assets/manifest.json
https://cdn.thejerseycourier.com/assets/brand/v1/mark.svg
```

The CDN sends long-lived immutable caching and permissive CORS headers for
versioned `/assets/*` files. It also sends `X-Robots-Tag` because asset delivery
is not a separate search property.

## Verification

After deployment:

1. Confirm the Studio root reaches `/studio` and an unauthorized session still
   receives the normal Clerk access gate.
2. Confirm `https://api.thejerseycourier.com/v1/stories` reaches the existing
   protected reader API and developer endpoints still require API keys.
3. Confirm CDN assets return the expected cache, CORS and no-index headers.
4. Confirm any NJC+ path redirects once to the same path on
   `https://www.thejerseycourier.com`.
5. Keep Studio, API and CDN out of the public sitemap. Only canonical public
   article and section URLs belong in Google Search.
