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
| `press.thejerseycourier.com` | `njc-web` | Public Press & Media portal. Conversational intake is public and rate-limited; policy decisions, private packages, downloads, and Studio review remain server-authorized and audited. |
| `status.thejerseycourier.com` | separate project rooted at `apps/status` | Independent public availability dashboard, live contract-aware checks, JSON health endpoints and optional 90-day aggregate history. It must never be served by `njc-web`. |
| `int.thejerseycourier.com` | separate project rooted at `apps/internal` — **not deployed** | Reserved internal boundary. It must remain without public DNS or a production deployment until the documented Cloudflare Access + mTLS perimeter, explicit eligibility grant, and denial matrix pass. |

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
NEXT_PUBLIC_PRESS_HOST=press.thejerseycourier.com
NEXT_PUBLIC_PRESS_URL=https://press.thejerseycourier.com
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

The internal host is not another rewrite on `njc-web`. Its deployable shell and
complete repository classification live in
[`docs/security/INTERNAL_BOUNDARY.md`](security/INTERNAL_BOUNDARY.md). Do not
create its DNS record, attach its domain, or deploy its Vercel project until the
external mTLS perimeter is configured first. A Clerk gate, 404, `noindex`, or
ordinary WAF denial does not satisfy the connection-level denial requirement.

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
6. Confirm the Press host root renders the dedicated portal, `/press` on the
   main domain still serves the legacy generator, request APIs are no-index,
   and a package download fails without its current request-bound header token.
7. Confirm the Status host remains available while `njc-web` is unavailable,
   reports every managed hostname using its own expected response contract, and
   labels missing history as unknown rather than uptime.
