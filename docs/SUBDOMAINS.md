# Production subdomains

The Courier uses one canonical public site, one database-backed application
deployment and one separately deployable static asset origin.

| Host | Vercel project | Behavior |
| --- | --- | --- |
| `www.thejerseycourier.com` | `njc-web` | Canonical public publication |
| `studio.thejerseycourier.com` | `njc-web` | Serves Studio at `/` through an internal rewrite; Studio authentication and authorization remain enforced by Clerk and the API |
| `api.thejerseycourier.com` | `njc-web` | Clean `/v1/*` and `/developer/*` aliases rewrite to the existing versioned API routes |
| `cdn.thejerseycourier.com` | dedicated CDN project rooted at `apps/cdn` | Immutable public brand and editorial assets; never private newsroom material |
| `plus.thejerseycourier.com` | `njc-web` | Host-aware NJC+ product routes; unavailable public surfaces redirect to the canonical publication while Studio preview and invited-beta access remain entitlement-gated |
| `distribution.thejerseycourier.com` | `njc-web` | Private, no-index advance-release library. Every package, preview, stream, and download is authorized server-side against a verified Clerk account and an active database grant. |

DNS labels cannot contain `+`, so the public hostname for NJC+ is `plus`.
The host rewrites to the separate `/plus` product shell without exposing or
weakening the `njc_plus_beta` release boundary.

## Web project environment

Set these values for Production:

```dotenv
NEXT_PUBLIC_SITE_URL=https://www.thejerseycourier.com
NEXT_PUBLIC_STUDIO_URL=https://studio.thejerseycourier.com
NEXT_PUBLIC_STUDIO_HOST=studio.thejerseycourier.com
NEXT_PUBLIC_API_HOST=api.thejerseycourier.com
NEXT_PUBLIC_PLUS_HOST=plus.thejerseycourier.com
NEXT_PUBLIC_DISTRIBUTION_HOST=distribution.thejerseycourier.com
NEXT_PUBLIC_DISTRIBUTION_URL=https://distribution.thejerseycourier.com
DISTRIBUTION_ENABLED=false
NEXT_PUBLIC_ASSET_ORIGIN=https://cdn.thejerseycourier.com
```

The web UI may continue using same-origin API calls. The API subdomain exists
for official applications and documented integrations; it does not weaken API
keys, rate limits, Clerk authorization or per-route permission checks.

Keep `DISTRIBUTION_ENABLED=false` until migration `0020`, the private Blob
store, Clerk production-domain authorization, and the DNS alias are all
verified. Distribution uses the existing `njc-web` deployment so it can reuse
the authoritative account and grant records, but its binaries remain in
private Blob storage and are delivered only through authenticated streaming
routes. Never attach `distribution` to the static CDN project, Search Console,
the sitemap, or a public media URL.

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

1. Confirm the Studio root serves the newsroom without exposing `/studio` in
   the browser, and an unauthorized session still receives the normal Clerk
   access gate. Confirm the legacy public `/studio/*` URL permanently redirects
   to the matching clean Studio-subdomain path.
2. Confirm `https://api.thejerseycourier.com/v1/stories` reaches the existing
   protected reader API and developer endpoints still require API keys.
3. Confirm CDN assets return the expected cache, CORS and no-index headers.
4. While `njc_plus_beta` is off, confirm the NJC+ host returns the fail-closed
   not-found response. After launch approval, confirm its root, section and
   content routes render the NJC+ product shell.
5. Keep Studio, API and CDN out of the public sitemap. Only canonical public
   article and section URLs belong in Google Search.
