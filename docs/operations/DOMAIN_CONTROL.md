# Domain control and hostname registry

## Production boundary

The authoritative publication domain is `thejerseycourier.com`. The hostname
registry is intentionally finite: adding arbitrary customer-controlled domains
from a browser would turn Studio into a DNS control plane and create avoidable
takeover, certificate and phishing risk.

| Host | Owner | Intended state |
| --- | --- | --- |
| `thejerseycourier.com` | NJC web | Apex redirect to `www` |
| `www.thejerseycourier.com` | NJC web | Canonical public publication |
| `studio.thejerseycourier.com` | NJC web | Authenticated newsroom Studio |
| `api.thejerseycourier.com` | NJC web | Developer portal and API |
| `plus.thejerseycourier.com` | NJC web | NJC+ |
| `cdn.thejerseycourier.com` | NJC CDN | Immutable public assets |
| `press.thejerseycourier.com` | NJC web | Press & Media portal |
| `distribution.thejerseycourier.com` | NJC web | Authorized distribution portal |
| `links.thejerseycourier.com` | NJC web | Curated Link in Bio and article redirects |
| `status.thejerseycourier.com` | NJC Status | Independent public availability and incident surface |
| `int.thejerseycourier.com` | Separate internal app | No DNS until Access + mTLS is proven |

The reserved web labels `support`, `careers`, `events`, `live`,
`weather`, `newsletters`, `ads`, and `account` are attached to `njc-web`, have
authoritative IONOS CNAMEs and managed HTTPS, and redirect to the canonical
publication until a reviewed product surface replaces that redirect. `press`,
`distribution`, and `links` use dedicated first-party routes on the same project.
`status` remains excluded from generic provisioning because its dedicated
project must remain independent of the primary application. `int` is excluded
and has no DNS record because publication before the connection-level perimeter
would violate the internal-boundary design.

The August 11, 2026 activation used these provider targets:

- `press`, `distribution`, `links`, `support`, `careers`, `events`, `live`,
  `weather`, `newsletters`, `ads`, and `account` →
  `637644a6ea56a9c4.vercel-dns-017.com.`
- `status` → `41e5f6338ab579af.vercel-dns-017.com.`

Public DNS, Vercel ownership and TLS were verified after activation. These
records do not authorize the internal hostname or expand the Studio operator
allowlist.

## Studio control center

The control center is served at `/studio/settings/domains` and cleanly at
`https://studio.thejerseycourier.com/settings/domains`. It is defense in depth,
not a replacement for provider controls:

1. Exact production Studio host (or localhost in development).
2. Authenticated, active Clerk/Studio account.
3. Administrator role.
4. Exact Clerk ID in `DOMAIN_CONTROL_OPERATOR_CLERK_IDS`.
5. `DOMAIN_CONTROL_ENABLED=true` server-side release switch.
6. Durable database availability for audit events.
7. Five-minute HMAC preview bound to actor, hostname and operation.
8. Exact `CREATE <hostname>` confirmation plus a 20-character audit reason.
9. Fixed Vercel team and project IDs; the client cannot choose either.
10. A repository allowlist; no arbitrary hostname, record type, target, deletion
    or apex mutation is accepted.

Every success and partial failure is written to `employee_audit_logs`. Provider
tokens and DNS zone IDs are never returned to the browser or portable export.
The portable export records only the required environment-variable names.

## Required server configuration

```dotenv
DOMAIN_CONTROL_ENABLED=true
DOMAIN_CONTROL_OPERATOR_CLERK_IDS=user_exact_clerk_id
DOMAIN_CONTROL_CHALLENGE_SECRET=<32-or-more-random-characters>
VERCEL_API_TOKEN=<scoped-expiring-token>
VERCEL_PROJECT_ID=prj_HnakjR7NF2r9J4ufJOAZ8C8NCfWS
VERCEL_TEAM_ID=team_xU5SdLMcdBfDputrtA0izdP5
```

Use a scoped, expiring Vercel access token. Rotation is an operational task;
never paste the token into Studio, source control, logs, browser storage or an
export.

Full authoritative-DNS automation is optional and is enabled only when all of
these are present:

```dotenv
IONOS_DNS_API_TOKEN=<least-privilege-token>
IONOS_DNS_ZONE_ID=<thejerseycourier.com-zone-id>
IONOS_DNS_API_URL=https://dns.de-fra.ionos.com
```

This adapter follows the official IONOS Cloud DNS v1 record API. A consumer
IONOS domain account is not assumed to expose that Cloud DNS zone. If the
actual authoritative zone is unavailable through that API, leave these values
unset: Studio will attach the allowlisted hostname to Vercel and return the
exact provider CNAME for a manual, reviewed DNS change.

## Recovery and verification

- The control cannot delete or retarget a hostname. Recovery uses the provider
  dashboard and the existing audited runbooks.
- Re-run the provider status refresh and then verify `dig CNAME`, HTTPS, the
  certificate, redirects/rewrites, canonical metadata and `X-Robots-Tag`.
- A Vercel attachment with failed DNS is safe but incomplete. Do not claim the
  hostname is live until public resolvers and an HTTPS request both pass.
- Never enable `int` here. Follow `docs/security/INTERNAL_BOUNDARY.md`.
