# Press & Media external activation and legal validation

DNS activation, AI/email integrations and legal approval are independent gates.
A green deployment does not mean a license has been approved by counsel.

## Current verified state

- The Press portal is deployed and remains available at
  `https://www.thejerseycourier.com/press-portal` during DNS transition.
- `press.thejerseycourier.com` is attached to the existing Vercel project, but
  the hostname currently returns NXDOMAIN because its IONOS DNS record is not
  present. The required record remains:
  `CNAME press 637644a6ea56a9c4.vercel-dns-017.com.`
- The IONOS control page requires an account login; no DNS mutation was made.
- Cloudflare Workers AI and transactional email remain optional. Their absence
  does not loosen authorization or release an asset.
- The versioned policy and generated license remain repository-derived and
  provisional. No operating entity, governing jurisdiction, monitored Press
  contact, final retention period or counsel approval was invented.

## Recorded legal gate

Studio’s Press & Media page now reports six independent checks. Exact versions
are required so a generic “approved” flag cannot silently survive a policy
change:

```dotenv
PRESS_LEGAL_APPROVED_POLICY_VERSION=njc-press-media-v1
PRESS_LEGAL_APPROVED_LICENSE_VERSION=njc-press-identification-v1
PRESS_LEGAL_ENTITY_NAME=<counsel-approved operating entity>
PRESS_LEGAL_JURISDICTION=<counsel-approved decision>
PRESS_CONTACT_EMAIL=<monitored address>
PRESS_REQUEST_RETENTION_DAYS=<approved positive period>
```

Only qualified reviewers should set those values. The application merely
records whether the exact current versions and required decisions are present;
it does not provide legal advice or create rights.

## DNS activation procedure

1. Sign into the domain owner’s IONOS account.
2. Add only the `press` CNAME above. Do not alter MX, apex, `www`, Studio, API,
   NJC+, distribution, verification or mail records.
3. Confirm public DNS resolution and Vercel SSL issuance.
4. Run `pnpm domain:verify:press -- https://press.thejerseycourier.com`.
5. Set `PRESS_SUBDOMAIN_ENABLED=true` in Vercel production only.
6. Redeploy and repeat the host/canonical/legacy/API/download matrix in
   `docs/PRESS_KIT_PORTAL.md`.

Do not enable the flag before DNS and SSL pass; that would redirect the working
main-domain portal to an unresolved hostname.

## Counsel validation packet

Provide the reviewer with:

- `apps/web/src/lib/press-kit-policy.ts` and exact policy/license versions;
- `apps/web/src/app/(site)/terms/page.tsx`, privacy page and legacy Press Kit;
- every catalog asset, source, attribution, restriction and license metadata;
- request fields, conversation retention, AI provider path and data flow;
- sample approved, partial, denied and manual-review decisions;
- sample PDF, manifest and ZIP with hashes;
- expiration/revocation semantics and portable restore behavior;
- entity, contact, jurisdiction, governing-law and dispute decisions.

Record requested changes as a new policy/license version. Do not mutate an
already-issued version in place.
