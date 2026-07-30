# Analytics producer and data-path inventory

This inventory is the source map for calculation version 2. It records what
each application produces, where it enters the backend and what Studio may
truthfully display.

## Producers

| Product | Platform | Producer | Events | Application identity |
| --- | --- | --- | --- | --- |
| Public publication | Web | `AudienceTracker` after analytics consent | Page views and presence | `news-web`, web version, Vercel commit/build, production/preview/development channel |
| Reader app | iOS / Android / web fallback | `reportAudiencePresence` | Presence | `reader-mobile`, Expo version/build, OS, phone/browser class |
| Employee app | iOS / Android | `reportEmployeeAudience` after authentication | Presence | `employee-mobile`, Expo version/build, OS, phone class |
| TV app | Apple TV / Android TV / Google TV | `reportPresence` | Presence | `reader-tv`, Expo version/build, OS, TV class |
| Roku channel | Roku / Roku TV | `ApiTask.reportPresence` | Presence | `reader-roku`, manifest version/build, release entitlement channel, Roku OS, TV class |
| NJC+ | Web publication routes | Public web tracker | Page views under `/plus` | Same web deployment identity |
| Developer API | API | API-key audit and last-used timestamps | Authenticated API consumption | Account-based metric; not an installation |
| CDN | Vercel/static delivery | None | No reader events | CDN requests are not silently treated as people or views |
| Studio | Web | No authoritative reader producer | Staff requests are classified internal | Excluded from production readership |
| Preview/local builds | All applicable | Same client contracts | Events marked preview/development | Excluded from authoritative production totals |

## Request boundaries

### Page views

1. The consenting web client creates a persisted random installation ID and a
   session-scoped session ID.
2. Each navigation creates a unique event ID and posts to
   `POST /api/v1/analytics/page-view`.
3. The reader-origin policy, rate limiter and automated-client filter run
   before analytics ingestion.
4. The route classifies staff/preview/development context without trusting the
   client.
5. `recordPageView` normalizes the route, resolves a published story, classifies
   source and device, and inserts the immutable event ID.
6. Only a newly inserted, verified production event increments the v2 daily
   aggregate. A retry with the same event ID changes nothing.

### Presence and application versions

1. Each client retains one installation ID across launches and upgrades where
   its platform storage permits.
2. A report contains a unique event ID, platform, product, release channel,
   application version, build number, OS version, device class and occurrence
   time.
3. `POST /api/v1/audience/presence` authenticates a linked account where
   available and classifies staff/preview/development context on the server.
4. A new event updates the current installation record and upserts a separate
   version-history row.
5. Retrying an event ID does not increment the installation, version or event
   counters.
6. An application upgrade updates the current installation and adds a version
   row; it does not create another installation.

## Storage and consumers

| Store | Purpose | Mutable? | Studio use |
| --- | --- | --- | --- |
| `analytics_events` | Event-level page-view evidence | Append-only by event ID | Audit, reconciliation and permission-controlled export |
| `analytics_daily_views` | Efficient daily v2 and legacy aggregates | Incremental by version/quality/environment/product dimension | Traffic charts and story/source/device summaries |
| `audience_presence_events` | Event-level installation check-ins | Append-only by event ID; removed on consent withdrawal | Presence audit and export |
| `audience_installations` | Current state of each installation | Updated after a new presence event | Platform activity and known-account linkage |
| `audience_installation_versions` | Per-installation application history | Counters and last-seen update within an identity | Application versions and upgrade adoption |
| `analytics_period_archives` | Current weekly/monthly/yearly snapshot | Replaced only after a new immutable revision is written | Archive view |
| `analytics_archive_revisions` | Immutable archive revision history | Append-only | Corrections, exports and audit |

## Exclusions and legacy boundary

- Routes under `/api`, `/studio`, `/sign-in`, `/sign-up`,
  `/employee-link` and `/_next` are not public page views.
- Search/social crawlers and preview agents are rejected.
- Known staff, Vercel previews and local development are not production
  readership.
- Migration `0024_clear_viper.sql` labels all pre-v2 traffic, installations and
  archives as legacy, copies archive history into the revision ledger and
  backfills legacy application-version evidence without asserting it is
  verified.
- Legacy aggregates cannot be reverse-engineered into people, sessions or
  event IDs and therefore remain excluded from authoritative v2 totals.

