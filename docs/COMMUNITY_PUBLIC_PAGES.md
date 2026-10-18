# Community discovery and bulletin pages

The public homepage includes a prominent **In the Community** showcase immediately
after the lead coverage in both public designs. It uses the existing Studio
`features.community` switch, not a second independent feature flag.

The showcase and `/community` index read the same published bulletin catalog.
Featured items sort first, then upcoming dated listings, then recent undated
updates. At most three appear on the homepage and 36 on the index. Empty and
database-unavailable states never substitute sample content.

Each card is one keyboard-accessible link to `/community/<existing-slug>`.
The dedicated page shows the complete bulletin, paragraph breaks, safe HTTPS
links, organizer, venue, date/time in the configured publication timezone and
an organizer/RSVP link when supplied. It is deliberately distinct from an
editorial news story and includes the community-listing disclaimer. Old events
retain their permalink with a date-passed notice. Drafts, archived/deleted items,
future publication times and feature-disabled requests are not public.

Only explicit public columns are selected. Staff account IDs and private
submission/contact information are never included. Existing bulletin records,
slugs and the current deployed schema are reused: no migration, new service or
paid dependency is needed. The separate unfinished image/review workflow is not
part of this release.

## Appearance

Before the first paint, the root bootstrap applies the saved explicit preference
or System to the `dark` class, `data-theme`, `data-bs-theme` and native color scheme.
An explicit Dark preference is not rewritten to System when the device happens
to be dark. Hydration uses the same document preference; storage changes, device
appearance changes and cached-page restoration synchronize it. Blocked storage
falls back to the document choice for that visit. Studio's surface variables now
follow the same root `dark` class rather than an absent per-panel attribute.

No storage preference can persist across visits if a browser intentionally blocks
or clears storage. Main-site and Studio subdomains still have separate browser
localStorage; this does not claim cross-origin preference synchronization.

## Verification

Automated coverage: public query constraints, single-link cards, complete detail
body, undated/past events, safe external URLs, escaped text, honest empty states,
slug validation, first-paint theme bootstrap, explicit preference retention and
blocked-storage/cached-document fallback. See `apps/web/tests/community-public.test.ts`
and `apps/web/tests/theme-bootstrap.test.ts`.

Release `5e8ad2c` was verified Ready in Vercel Production (2m 34s). Live checks
covered the homepage/index cards, the full Taplife and Two Jeans bulletins,
canonical metadata and a 390px dark-mode refresh with no horizontal overflow or
browser console errors. Twenty-five focused tests, targeted ESLint and the
production web build passed. The broader existing routing parity test still
reports a missing `/mag-engine` Studio-host rewrite, recorded separately in TODO.
