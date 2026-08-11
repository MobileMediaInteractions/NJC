# Internal service boundary

## Decision

The intended production host is `int.thejerseycourier.com`, but it must not be
published until its connection-level perimeter exists. The repository now has
a separately buildable `@njcourier/internal` application. It is disabled by
default, accepts only the configured host, requires a cryptographically
verified Cloudflare Access JWT, requires a matching verified Clerk email, an
active database account, and an explicit, unexpired `internal:access` grant.
It also requires a private Cloudflare-to-origin header value so a valid Access
JWT cannot simply be replayed to a raw Vercel deployment alias.

`internal:access` is deliberately absent from every role default, including
administrator. A Studio role, employee-app eligibility, NJC+ entitlement,
invited-beta grant, possession of the hostname, or a forged proxy header is not
internal-host eligibility.

The initial internal app contains only a boundary/status shell and session
endpoint. It does not duplicate Studio or read privileged operational records.
Its Clerk sign-in route is rendered only after the signed perimeter identity
maps to an active database account with an active `internal:access` grant; the
final session must use that exact Clerk account and verified email.
Audited workflows migrate one at a time after parity, rollback, direct-object
authorization and notification/deep-link tests pass.

## Why Vercel authentication alone is insufficient

Vercel Hobby Standard Protection protects previews and generated deployment
URLs, but does not protect a production custom domain. Production-domain
protection requires a paid plan/add-on. A Vercel Firewall deny returns HTTP
403, and a Clerk guard runs after DNS and TLS; neither produces the requested
connection-level failure.

The selected free-compatible perimeter is Cloudflare Zero Trust Free (currently
documented for teams under 50 users) with:

1. Cloudflare-proxied `int.thejerseycourier.com`.
2. A Cloudflare Access self-hosted application for the whole host.
3. A private NJC certificate authority uploaded to Access.
4. mTLS required for every request; each approved device receives a unique,
   expiring client certificate.
5. Identity login after successful client-certificate validation.
6. A signed Access JWT validated again by the internal app.
7. A Cloudflare-set origin proof compared in constant time by the app.
8. A matching verified Clerk account, active database user and explicit
   `internal:access` grant.

Without a valid client certificate, Cloudflare blocks the request during the
mutual-TLS exchange before NJC or Vercel application code is reached. Public DNS
and certificate-transparency records can still reveal the hostname; only
private/split-horizon DNS can also hide the hostname itself. If hostname
nonexistence is literal rather than connection denial, use WARP plus private
DNS and do not publish a public record.

Official references used for this decision:

- <https://vercel.com/docs/deployment-protection>
- <https://vercel.com/docs/vercel-firewall/firewall-concepts>
- <https://www.cloudflare.com/plans/zero-trust-services/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/mutual-tls-authentication/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/policies/>

## Scope decision

| Surface | Current disposition | Internal target |
| --- | --- | --- |
| Editorial Studio | Remains on `studio` during migration | Move privileged administration section-by-section; do not create a second source of truth |
| Story authoring/review | Protected newsroom workflow | Keep on Studio initially; reassess only after author/approver mobile and desktop dependencies are mapped |
| Team chat/directory | Employee API + Studio + employee app | Keep versioned client API; move browser administration and sensitive directory views |
| Access and role review | Studio/employee API | Move reviewer controls; preserve employee request/status API |
| Site configuration | Studio | Move primary administrative control after revision/rollback parity |
| Analytics and exports | Studio | Move sensitive drill-down, reconciliation and export; keep consented public collection endpoints public |
| Finance, legal, NJC+ administration | Studio | Highest-priority migration because of financial, legal and entitlement sensitivity |
| Platform licensing administration | Studio APIs | Move admin catalog/license controls; retain public client activation/lease APIs |
| Distribution | Controlled external product | Keep external package viewer; move package administration only |
| Press requests | Public tokenized portal + Studio | Keep intake/delivery public; move reviewer/catalog administration only |
| Platform playgrounds and demos | Local/build-time | Never deploy on `int` unless converted into an explicitly authorized operational tool |
| Studio NJ Dev | Signed desktop product | Keep separately licensed; use versioned service credentials for future internal service calls |

## Deployment stages

### Stage 0 — current repository state

- `apps/internal` builds but `INTERNAL_HOST_ENABLED=false`.
- No `int` DNS record is created.
- No public navigation, sitemap, metadata, email or client bundle names the
  host.
- CI verifies the internal app and the generated route/data register.

### Stage 1 — provider and identity setup

1. Place the domain under an approved Cloudflare DNS arrangement without
   changing unrelated mail or publication records.
2. Create a Zero Trust organization owned by the publication.
3. Configure an identity provider and Access application.
4. Create an offline root CA; upload only the public CA certificate. Protect
   the private key outside source control and browser storage.
5. Issue one certificate per device with owner, serial, start, expiration and
   revocation record. Never share one certificate across the team.
6. Create the separate Vercel project with Standard Protection for previews,
   a least-privilege database role, separate Clerk allocation and only required
   environment variables.
7. Configure the exact Access issuer and AUD; do not trust unsigned
   `cf-access-*` identity headers.
8. Generate a separate 32+ character origin secret, store it only in Cloudflare
   request-header configuration and the internal Vercel project, and have
   Cloudflare replace `X-NJC-Internal-Origin` on every origin request.

### Stage 2 — five-way denial proof

Test from an authorized enrolled device, authenticated but unauthorized
account, signed-out enrolled browser, unenrolled device, and unrelated public
network. Also test raw Vercel aliases, previews, forged Host and forwarded-host
headers, public-site path aliases, static assets and the session API.

The host is not available until an unenrolled client is rejected before the
app, the Access JWT cannot be replayed to the raw origin, and an enrolled but
ungranted Clerk account receives no internal record data.

### Stage 3 — reversible workflow migration

Move one bounded workflow at a time. Each migration needs a single authoritative
write path, server-side section/action capability, audited sensitive reads and
mutations, private storage, rate limits, old-client compatibility, rollback and
an acceptance matrix. Do not redirect all of Studio to `int`.

## Recovery and break glass

- Revoke a device certificate and `internal:access` grant independently.
- Disable `INTERNAL_HOST_ENABLED` to fail the application closed.
- Revoke the Cloudflare Access application or rotate its AUD after a perimeter
  compromise.
- Rotate Clerk and database credentials without changing public clients.
- Break-glass access must be a named, expiring certificate plus named Clerk
  account and explicit grant, approved by a different person where possible.
  There is no shared password, secret URL, permanent bypass or client claim.
- During a Cloudflare outage, the internal host remains unavailable. Existing
  Studio workflows remain the documented rollback until their migration is
  separately accepted.

## Cost and metadata limits

Cloudflare documents Zero Trust Free as $0 for fewer than 50 users with shorter
log retention and no paid SLA. Vercel Hobby does not make production custom
domains private and is separately documented as intended for personal/small
projects; commercial-hosting suitability remains an overall launch item. A
public `int` DNS name and server certificate are discoverable even when mTLS
prevents application access. These are explicit limitations, not hidden by a
404 or `robots.txt`.
