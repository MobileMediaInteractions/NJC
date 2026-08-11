# Press & Media portal

The dedicated production hostname is `press.thejerseycourier.com`. It is a
host rewrite in the existing `njc-web` deployment, not a second application or
asset copy. The legacy public route at `www.thejerseycourier.com/press` remains
operational during migration and links to the new system for custom requests.

## Trust boundary

The intake model can extract requester details, ask follow-up questions, and
match natural-language needs to the public catalog. It cannot approve a use,
change policy, query arbitrary storage, create file paths, choose private files,
or write license language. Every model result is validated and every returned
asset ID is intersected with the application catalog.

The deterministic policy evaluator uses version
`njc-press-media-v1`. Its automatic license is limited to the media-use
language already present in the repository terms and legacy Press Kit:
accurate editorial identification for news, broadcast, podcast, research,
educational, review, and event use. Promotional, commercial, ambiguous,
restricted, private, prompt-injection, or otherwise rights-sensitive requests
go to Studio. Existing exclusions—merchandise, political advocacy, paid
endorsement, misleading use, and standalone redistribution—remain exclusions.

No new legal entity, governing law, contact, usage term, or license duration
was invented. The operating entity, monitored legal/press contact, complete
retention schedule, and counsel-approved final license language are still
missing product inputs. Generated PDFs visibly identify that limitation.

Studio reports the exact-version legal readiness gate documented in
[`PRESS_LEGAL_VALIDATION.md`](PRESS_LEGAL_VALIDATION.md). Deployment and DNS
activation do not satisfy that gate.

## Lifecycle

`draft / intake / needs_information -> evaluating -> approved /
partially_approved / manual_review / denied -> package_generating -> ready ->
downloaded / expired / revoked`

Legacy instant packages retain the historical `generated` state.

Each request records the confirmed brief, minimized AI interpretation, policy
version, exact asset decisions, reviewer action, package manifest, hashed abuse
and access credentials, and download events. Raw access tokens are never stored.

## Package security

- Packages are assembled only from approved catalog UUIDs.
- Bundled filenames are normalized and checked again by the archive builder.
- Media Library files retain their public/private Blob access behavior.
- ZIP files are written to private Vercel Blob and expire after seven days.
- A request token authorizes request history; a separately rotated download
  token authorizes the package stream through a request header.
- Token values never appear in permanent URLs, database rows, logs, portable
  backups, or package manifests.
- Portable backups include request/catalog/audit records and private media, but
  remove request tokens and revoke restored package tokens.

## Studio

Administrators, editors, and producers can open **Press & Media requests** to:

- filter manual, active, completed, and closed requests;
- inspect the brief, transcript, AI concerns, policy result, and audit events;
- select exact catalog assets and approve, partially approve, deny, request
  more information, or revoke;
- inspect package status, expiry, and download count.

Only administrators can change catalog availability or add a Media Library
item. A Media Library item must be ready and have license metadata before it
can enter the Press catalog. Storage paths are never typed into Studio.

## Required production configuration

Apply migration `0036_spooky_absorbing_man.sql`, then configure:

```dotenv
NEXT_PUBLIC_PRESS_HOST=press.thejerseycourier.com
NEXT_PUBLIC_PRESS_URL=https://press.thejerseycourier.com
PRESS_SUBDOMAIN_ENABLED=false
PRESS_KIT_TOKEN_PEPPER=<32-or-more-random-bytes>
PRIVATE_BLOB_READ_WRITE_TOKEN=<private Vercel Blob token>
KV_REST_API_URL=<Upstash/Vercel KV URL>
KV_REST_API_TOKEN=<Upstash/Vercel KV token>
CLOUDFLARE_ACCOUNT_ID=<existing account>
CLOUDFLARE_WORKERS_AI_TOKEN=<least-privilege Workers AI token>
CLOUDFLARE_AI_TEXT_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
```

Keep `PRESS_SUBDOMAIN_ENABLED=false` while DNS or SSL is incomplete. During
that transition, the production request experience remains available at
`https://www.thejerseycourier.com/press-portal`. Set it to `true` and redeploy
only after the dedicated readiness check passes.

The AI adapter is optional and fails over to deterministic intake rather than
opening an unrestricted chat endpoint. Transactional email is also optional:

```dotenv
RESEND_API_KEY=<sending-only key>
PRESS_EMAIL_FROM=The New Jersey Courier Press <press@thejerseycourier.com>
PRESS_CONTACT_EMAIL=<monitored address>
```

The sender domain must be verified before mail can be delivered. Missing email
configuration never blocks a decision or package.

## External deployment action

Attach `press.thejerseycourier.com` to the existing `njc-web` Vercel project and
create the DNS record Vercel requests. Vercel then provisions SSL. Do not point
the Press hostname to the static CDN project. Verify the host with the steps in
`docs/SUBDOMAINS.md` and the dedicated readiness check before treating it as
launched:

```bash
pnpm domain:verify:press -- https://press.thejerseycourier.com
```
