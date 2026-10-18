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
| `cut.thejerseycourier.com` | NJC web | Invitation-only Courier Cut portal; content remains available in NJC+ |
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
`distribution`, `links`, and `cut` use dedicated first-party routes on the same project.
`status` remains excluded from generic provisioning because its dedicated
project must remain independent of the primary application. `int` is excluded
and has no DNS record because publication before the connection-level perimeter
would violate the internal-boundary design.

The August 11, 2026 activation used these provider targets:

- `press`, `distribution`, `links`, `support`, `careers`, `events`, `live`,
  `weather`, `newsletters`, `ads`, and `account` →
  `637644a6ea56a9c4.vercel-dns-017.com.`
- `status` → `41e5f6338ab579af.vercel-dns-017.com.`

Public DNS, Vercel ownership and TLS were verified after activation. The later
`cut` hostname is repository-approved but still requires the same Vercel,
authoritative CNAME, TLS and host-routing verification before it is considered
active. These
records do not authorize the internal hostname or expand the Studio operator
allowlist.

## Studio control center

The control center is served at `/studio/settings/domains` and cleanly at
`https://studio.thejerseycourier.com/settings/domains`. It is defense in depth,
not a replacement for provider controls:

1. Exact production Studio host (or localhost in development).
2. Authenticated, active Clerk/Studio account.
3. Administrator role.
4. Exact verified **primary** email `alanmichaelsen12@gmail.com`, read from
   Clerk server-side and bound to the authenticated Clerk ID. An optional
   `DOMAIN_CONTROL_OPERATOR_CLERK_IDS` pin can narrow access further; it cannot
   authorize any other email. Other administrators cannot see the navigation
   item or configuration entry, load the page, or call the API.
5. `DOMAIN_CONTROL_ENABLED=true` server-side release switch.
6. Durable database availability for audit events.
7. Five-minute HMAC preview bound to actor, hostname, operation and a unique
   nonce. A Postgres transaction/advisory lock records the one-use intent in
   `employee_audit_logs` before contacting providers. Replays are rejected;
   a process interruption leaves a durable intent for reconciliation.
8. Exact `CREATE <hostname>` confirmation plus a 20-character audit reason.
9. Fixed Vercel team and project IDs; the client cannot choose either.
10. A repository allowlist; no arbitrary hostname, record type, target, deletion
    or apex mutation is accepted.
11. Same-origin JSON mutations, bounded request input, provider timeouts and
    a fixed outbound provider allowlist. No provider credential follows a redirect.

Every success and partial failure is written to `employee_audit_logs`. Provider
tokens and DNS zone IDs are never returned to the browser or portable export.
The portable export records only the required environment-variable names.

## Required server configuration

```dotenv
DOMAIN_CONTROL_ENABLED=true
# Optional additional immutable account pin; leave blank if not configured.
DOMAIN_CONTROL_OPERATOR_CLERK_IDS=
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
IONOS_DNS_API_URL=https://api.hosting.ionos.com/dns
```

The adapter now follows the official [IONOS Hosting DNS API](https://developer.hosting.ionos.com/docs/dns):
`X-API-Key`, `/v1/zones/<id>` and an array of FQDN records for creation. The
previous unactivated Cloud-DNS adapter is no longer used. Legacy Cloud or custom
endpoints fail closed instead of receiving a Hosting credential. No production
IONOS variables were present at the October 18 inspection, so no existing live
adapter configuration was changed.

The configured zone must be exactly `thejerseycourier.com`. Already-correct
CNAMEs are a no-op. Any same-name existing record, disabled record, different
target or service conflict requires manual provider review; Studio never
deactivates, deletes or replaces those records. Targets must be the actual
Vercel-returned DNS recommendation, not arbitrary browser input.

If DNS credentials are absent, the Vercel-only workflow still returns the
recommended CNAME for manual entry. A DNS response or Vercel ownership result
is not proof of successful TLS issuance.

## Current activation status and secure setup

October 18, 2026: the project Environment Variables UI was searched across all
environments for `DOMAIN_CONTROL`, `VERCEL_API_TOKEN` and `IONOS_DNS`; each
returned no results. No values were revealed or copied. Therefore production
provisioning is **not activated**, even after deploying the owner-only controls.

1. In `njc-web` → Environment Variables → Production, add a dedicated, scoped,
   expiring Vercel API token as **Secret**, along with the fixed project/team IDs
   above as Config. Never use a browser-session cookie as an API credential.
2. Generate an independent cryptographically random 32+ character challenge
   secret in a trusted password manager or terminal and add it directly as
   Production Secret. Do not commit or paste it into chat.
3. For optional DNS automation, create/add an IONOS Hosting DNS API credential
   directly through the provider's official flow. Retrieve the authoritative
   Courier zone ID via that provider; do not guess it. Keep the credential Secret.
4. Initially keep `DOMAIN_CONTROL_ENABLED=false`; deploy and inspect readiness
   while signed in to the verified owner account.
5. After credential scope and recovery are reviewed, enable the release switch,
   redeploy and perform a monitored idempotent activation. Confirm replay denial,
   another administrator's denial, audit intent/result records, DNS and HTTPS.

Creating provider credentials is a separate security-sensitive activation step.
It has not been performed by this code change. No paid plan or service is added.

The isolated release passed 24 focused authorization/DNS/navigation tests,
targeted ESLint and a production web build with TypeScript checks. Live
authenticated ownership checks and real database/provider mutation/replay
rehearsals remain unverified until secure activation. The pure DNS planner tests
do not claim to have changed or verified real DNS records.

## Recovery and verification

- The control cannot delete or retarget a hostname. Recovery uses the provider
  dashboard and the existing audited runbooks.
- Re-run the provider status refresh and then verify `dig CNAME`, HTTPS, the
  certificate, redirects/rewrites, canonical metadata and `X-Robots-Tag`.
- A Vercel attachment with failed DNS is safe but incomplete. Do not claim the
  hostname is live until public resolvers and an HTTPS request both pass.
- Never enable `int` here. Follow `docs/security/INTERNAL_BOUNDARY.md`.
