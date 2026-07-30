# NJ Courier analytics measurement dictionary

Status: calculation version 2 implementation baseline; product/editorial approval pending  
Publication timezone: `America/New_York`  
Event timestamps: client occurrence time plus authoritative server receipt time

The analytics system intentionally separates people, accounts, installations,
application versions, sessions and events. None of these terms may be used as
a synonym for another in Studio, exports, sales material or public reporting.

## Identity and activity

| Term | Definition | Unique key | Important limitation |
| --- | --- | --- | --- |
| Person | A human being. | Not inferred by analytics. | The platform cannot truthfully count people who have not identified themselves. |
| Known account | One distinct authenticated Clerk account linked to at least one verified production installation. | Clerk account ID, counted only as a distinct aggregate. | One person may control more than one account; the dashboard therefore says “known accounts,” not guaranteed people. |
| Anonymous visitor | A reader who has not supplied an authenticated account to the measurement request. | No durable person key. | Must never be counted as a known person. |
| Browser profile | One browser storage context that accepted analytics and retained its installation ID. | Random installation ID stored after consent. | Clearing storage, private browsing and using another browser creates another profile. |
| Physical device | Hardware running an application. | Not inferred for web. Platform installation keys may approximate it where the operating system supplies a stable app-scoped ID. | No fingerprinting is permitted to make this number appear more precise. |
| Installation | One persisted, consented browser profile or application installation. | Random installation ID or platform app-scoped installation ID. | An installation is not a person. Reinstallation may create a new installation. |
| Application version | One product, release channel, semantic version and build number observed for an installation. | Installation + product + channel + version + build. | Updating an installation adds version history without adding an installation. |
| Session | A web browsing period ending after 30 minutes of inactivity. | Random session ID held in session storage. | Tabs sharing or not sharing session storage may behave differently by browser. |
| Active installation | A verified production installation whose last accepted presence event falls inside the named rolling window. | Installation ID plus last accepted server receipt time. | It is not a daily active person count. |
| Account link | A verified installation associated with an authenticated account. | Installation-to-account relationship. | One account can link multiple installations. Studio’s headline count is distinct known accounts, not a sum of links. |
| API consumer | One distinct account owning a developer API key. | API-key owner account. | Key ownership and API activity are displayed separately. |

## Traffic

| Term | Definition | Deduplication | Time behavior |
| --- | --- | --- | --- |
| Event | One accepted, versioned measurement envelope. | Globally unique client event ID. | Server receipt time is authoritative for ingestion; occurrence time is retained for audit. |
| Page view | One verified production page-view event for an allowed public pathname. | A repeated event ID is accepted at most once. | Aggregated into the New Jersey publication day. |
| Story view | A page view whose normalized pathname resolves to a currently published story at ingestion. | Same event-ID rule as a page view. | A story deletion does not erase historical evidence; the stored headline/slug snapshot remains. |
| Non-story page view | A verified page view whose route is public but not a published story route. | Same event-ID rule. | `site views = story views + non-story page views` for the same filter. |
| Entry | The first accepted page view in a web session. | At most one entry per client session under normal operation. | Used for acquisition-source shares. |
| Unique reader | Not currently presented as an authoritative metric. | N/A | Requires an approved privacy-safe definition before use. |

## Acquisition

- **Session first touch** is the source attached to the first page entry in a
  session. It is the default acquisition model.
- **Direct** means no usable referrer or source hint was available; it does not
  prove the reader typed the URL.
- **Internal** means the referrer was an NJ Courier publication origin.
- Raw referrer URLs are classified and discarded. The database retains the
  category, not the source URL.
- First-touch, last-touch and per-view attribution must never be combined into
  one unlabeled percentage.

## Quality and environment

- **Verified** means the event has a client event ID, uses calculation version
  2 and passed the production-ingestion checks.
- **Legacy** means the record predates event-level evidence or came from a
  client that could not supply the v2 identity. Legacy figures are retained but
  excluded from authoritative totals.
- **Production** reader events can contribute to authoritative totals.
- **Internal**, **preview** and **development** events are retained only where
  needed for troubleshooting and never contribute to production readership.
- Known staff sessions are classified as internal. Automated clients identified
  as crawlers, social preview agents or bots are rejected before ingestion.

## Privacy and retention principles

- Do not use covert browser or hardware fingerprinting.
- Do not store raw referrer URLs, IP addresses or user-agent strings in the
  analytics event ledger.
- Evidence exports pseudonymize installation, session and account identifiers.
- Consent withdrawal deletes the installation, version history and presence
  ledger for that installation. Traffic events contain no account identity.
- The current retention behavior is explicit: verified and legacy ledgers,
  aggregates and archives are retained until a consent withdrawal, valid data
  request or documented correction/removal policy applies. There is no hidden
  automatic expiry. A future time-based retention limit must be applied
  consistently to event ledgers, aggregates, exports and backups and documented
  before activation.
- Late client occurrence times are retained for evidence, but the authoritative
  publication day and active window use server receipt time. A delayed or
  replayed event therefore cannot rewrite a previously closed day merely by
  supplying an older client clock.
