# NJC independent status service

`status.thejerseycourier.com` is a separate Next.js application rooted at
`apps/status` and must be deployed to its own `njc-status` Vercel project. It
must not be an alias of `njc-web`: the publication cannot host the page that is
supposed to explain a publication outage.

## Coverage

The public dashboard and `/api/status` inspect the apex domain, every managed
NJC subdomain, the permanent `njc-web.vercel.app` origin, and the status service
itself. Checks use fixed repository-owned targets and response contracts:
authentication gates and deliberate redirects can be healthy responses.
`int.thejerseycourier.com` is reported as protected by design and is never
probed or disclosed through an alternate address.

The status API never accepts a target URL, hostname, path, or expected status
from a requester. It does not expose credentials, private routes, provider
topology, storage paths, customer data, or internal health details.

## Historical data

Live status works without storage. Ninety-day tick history is enabled only when
the independent status project has its own free-compatible Upstash Redis:

```dotenv
STATUS_REDIS_REST_URL=
STATUS_REDIS_REST_TOKEN=
STATUS_CHECK_TIMEOUT_MS=6000
```

`GET /api/status/collect` is a fixed-target collector. It records at most one
sample per five-minute bucket, keeps a single aggregate document per UTC day,
and expires documents after 110 days. Without storage it fails closed before
performing outbound checks. Missing days render as gray “no measurement” ticks
rather than fabricated uptime.

After DNS and storage are verified, call the collector from an independent
free scheduler at a reviewed interval. Do not schedule it from `njc-web`, and
do not report a 90-day percentage until retained samples exist.

## Release checklist

1. The independent `njc-status` Vercel project is created with root
   `apps/status`, connected to this repository's `main` branch and has a
   successful production deployment. Its provider-protected `/api/health` and
   `/api/status` routes returned HTTP 200 during activation verification.
2. `status.thejerseycourier.com` is attached to `njc-status`. At IONOS, add
   exactly `CNAME status 41e5f6338ab579af.vercel-dns-017.com.`; do not reuse
   the `njc-web` or `njc-cdn` target.
3. Provision a separate Redis database and add only the two status credentials.
4. Verify `/`, `/api/status`, `/api/health`, robots, sitemap, HTTPS, canonical
   metadata, light/dark/system themes, responsive layout and every service row.
5. Start external collection and confirm the first tick reflects a real sample.
6. Add an operational incident-authoring and subscriber-notification workflow
   before claiming those capabilities; the current page reports live detected
   issues and does not invent incident history.
