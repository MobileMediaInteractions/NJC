# Internal-boundary register

The machine-readable register at
[`INTERNAL_BOUNDARY_ROUTES.json`](INTERNAL_BOUNDARY_ROUTES.json) is generated
from every Git-tracked or pending repository file and expands every Next.js
page/route, Drizzle table and workspace package. Each file records an owner,
broad sensitivity/classification, disposition and whether it is a test/fixture,
generated artifact or contains a TODO/FIXME-style marker.
Run `pnpm internal:audit:write` after adding or moving a surface; CI runs
`pnpm internal:audit` and fails when the register is stale.

The generator is intentionally conservative. It records source paths and broad
classification; this document adds ownership, caller and migration judgment.

## Repository applications

| Application | Owner/purpose | Deployment/callers | Sensitivity and authorization | Disposition |
| --- | --- | --- | --- | --- |
| `apps/web` | Publication web, Studio, APIs and server workers | `njc-web` Vercel project; browsers, apps, TV, Roku, jobs, providers | Mixed public through restricted financial/internal; Clerk, capabilities, API keys, tokens and provider signatures | Retain public service; extract privileged browser administration incrementally |
| `apps/internal` | Connection-gated internal operations | Separate Vercel project behind Access+mTLS; enrolled staff devices | Internal/restricted; Access JWT + matching Clerk identity + active account + explicit grant | Disabled scaffold; activate only after perimeter proof |
| `apps/mobile` | Reader iOS/Android | Expo/store builds calling public/account APIs | Public/account; Clerk and secure storage | Remains outside internal boundary |
| `apps/employee` | Employee/admin iOS/Android | Private Expo/EAS distribution calling employee APIs | Privileged; Clerk + employee capabilities + channel/resource checks | Remains a separate privileged client; API contract retained |
| `apps/tv` | Apple TV and Android/Google TV | Store/device builds calling TV/public/pairing APIs | Public/account device session | Outside internal boundary |
| `apps/roku` | Roku SceneGraph channel | Roku package calling public/pairing APIs | Public/account device session | Outside internal boundary |
| `apps/cdn` | Versioned public brand/editorial assets | Static Vercel project | Public immutable assets only | Never store internal media/exports here |
| `apps/platform-playground` | Runtime development playground | Local build/dev | Development-only; examples may contain fixtures | Do not deploy; future operational tooling needs explicit classification |
| `tools/studio` | Studio NJ Dev Tauri/Rust desktop composer | Signed desktop artifacts | Licensed local projects and native filesystem access | Keep separately licensed; no implicit internal access |
| `platform` | Feature/animation runtime, language, C ABI and licensing primitives | Linked into apps/tools; npm-style build artifacts | Mixed build-time and security-sensitive receipt logic | Reuse contracts; license administration migrates, client validation stays public |
| `visual-feature-platform` | Visual Feature Composer packages/playground | Local build and desktop integration | Development/build-time | No internal deployment by default |

## Shared packages and trust direction

| Package | Data flow | Boundary rule |
| --- | --- | --- |
| `packages/contracts` | Server-to-web/mobile/TV/Roku/employee schemas and capabilities | Safe types/constants only; no secrets or privileged implementation |
| `packages/api-client` | Clients to versioned web APIs | Keep public/client-safe; never embed internal host or service credentials |
| `packages/backend` | Server to Neon/Postgres | Server-only; internal deployment receives a separate least-privilege database role |

## Route families

| Family | Classification | Authentication/authorization | Final disposition |
| --- | --- | --- | --- |
| Public editorial pages, feeds, metadata and reader APIs | Public | Anonymous or consent/abuse controls | Stay on publication/API hosts |
| `/press-portal`, Press request APIs and package token flow | Public tokenized/professional contact | Request-bound hashes, exact asset allowlist, private Blob stream | Stay on Press host; reviewer controls migrate |
| `/distribution` viewer and distribution APIs | Controlled external | Clerk plus package/file grants | Stay external; administrator controls migrate |
| `/plus` and NJC+ APIs | Account/premium external | Clerk plus entitlement | Stay on NJC+ host; commerce/entitlement administration migrates |
| `/developers`, developer APIs and key management | Public/scoped developer | Clerk for key management; scoped API key for reads | Stay on API host; audit and account administration migrate |
| `/api/v1/device-*`, `/login/*` | Public protocol | Single-use secret/code, claim nonce, Clerk approval, device token | Stay public and versioned |
| `/api/v1/employee/*` and `/api/v1/mobile/admin/*` | Internal client API | Clerk session plus capability/resource checks | Retain for employee app; split browser admin from client API |
| `/studio/*`, `/api/v1/studio/*` | Internal browser administration | Clerk newsroom role plus endpoint policy | Migrate section-by-section; keep one write authority |
| Platform activation/lease/validation | Licensed external service | Signed license/installation receipts and rate limits | Stay public service-only API |
| Platform admin | Internal administration | Employee platform-license capability | Migrate to internal service |
| Cron and webhooks | Service-only | Strong bearer secret or provider signature | Remain non-browser service routes; restrict host/path and audit failures |

## Stored-data classification

The generated register includes every Drizzle table. The decisive rules are:

- publication content is public-read/private-write;
- user, employee, chat, access, audit and presence data is internal
  confidential;
- finance, subscriptions, payment events and close records are restricted
  financial;
- API hashes, device sessions, pairing credentials, signing keys, license keys
  and installation receipts are security-sensitive;
- Press request identity/transcript/license/download events are professional
  contact and authorization records;
- distribution files/grants/progress are controlled-distribution records;
- analytics/presence/installations are privacy-sensitive and remain subject to
  consent, pseudonymization, retention and aggregate access rules;
- public Blob/CDN objects must never contain chat attachments, exports,
  financial evidence, private distribution files or Press packages.

## CI, preview and release findings

- GitHub CI builds all public apps, the employee app, Roku, TV, platform,
  Studio NJ Dev and the new internal app. The register check prevents a route or
  table from being added without an updated boundary artifact.
- The newsroom cron calls the canonical public host using `CRON_SECRET`; it is
  service-only and must not be moved behind the human browser perimeter.
- Studio desktop packaging produces 30-day GitHub artifacts. It must not
  receive internal browser credentials or an mTLS certificate in the package.
- `apps/web` currently combines public and privileged code in one deployment.
  This is the primary migration reason; moving everything at once would break
  mobile/TV/Roku, webhooks, pairing and public publishing.
- The internal app must use Vercel Standard Protection for previews and accept
  only its exact production host. The app rejects a raw Vercel alias even when
  a caller replays a valid Access JWT because the exact host and private
  Cloudflare-to-origin proof are also required.

## Known incomplete or externally gated items

- No `int` DNS record, Cloudflare Access application, CA, client certificate,
  identity provider or separate Vercel project is created by the repository.
- No account currently inherits `internal:access`; explicit grants must be
  issued only after device enrollment exists.
- Studio browser workflows have not moved. That is intentional: parity and
  rollback evidence precede each migration.
- App-store signing, notification providers, payment providers, Press DNS,
  legal entity/contact decisions and several real-device rehearsals remain in
  the root TODO and are not internal-boundary completion evidence.
