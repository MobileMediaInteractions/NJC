# Courier Live Desk

Courier Live Desk is the publication's first-party continuous-reporting system.
It is distinct from the live video channel and from silently editing an article:
each development is a timestamped, attributed, revisioned timeline record.

## Reader surfaces

- `/live` lists active, upcoming and completed desks while preserving the
  existing verified live-video channel fallback.
- `/live/[slug]` renders the public timeline, optional verified stream, source
  links, media, pinned essential updates, corrections and completion state.
- Active desks refresh every eight seconds while the page is visible. The
  client merges updates by server ID, announces new material accessibly, keeps
  an explicit manual refresh, reports offline/error state, and stops the active
  interval when coverage ends.
- The homepage promotes the current active desk and the global header replaces
  the ordinary latest-story ticker with a red live link while coverage runs.
- `/api/v1/live/coverage` and `/api/v1/live/coverage/[slug]` expose public,
  sanitized contracts. The existing `/api/v1/live` channel contract is
  unchanged for mobile, television and legacy clients.
- Incremental timeline responses contain safe public changes plus update-ID
  tombstones for material retracted after the client cursor. The browser
  applies those tombstones immediately so withdrawn copy cannot linger on an
  already-open live desk.
- The detail page emits `LiveBlogPosting` structured data and only becomes
  indexable after the repository's global production-indexing switch is on.

## Newsroom surface

Studio's **Editorial → Live Desk** workspace supports:

- private desk creation;
- scheduling, starting, pausing, resuming, ending and archiving;
- exactly one featured desk at a time;
- title, description, location, image and HTTPS stream configuration;
- draft or immediately published timeline entries;
- standard, breaking, result, quote, context, media and correction entry types;
- HTTPS source and media references;
- pinned essential updates;
- revision reasons, corrections, publishing and explicit retraction;
- typed title confirmation before ending or archiving a desk; and
- typed `RETRACT` confirmation before removing a public update.

Reporters can create desks and draft entries. Producers, editors and
administrators control every public state transition and every change to
already-public timeline content. Contributors cannot enter the workspace.
Every privileged mutation also writes to the existing API audit log.

## State machines

Desk lifecycle:

```text
draft -> scheduled -> live -> paused -> live -> ended -> archived
   |          |         |       |                 |
   +----------+---------+-------+-----------------+-> archived
```

Only transitions explicitly permitted by the server are accepted. Scheduling
requires a future time, but it does not auto-start the desk: a publishing role
must deliberately begin live coverage.

Update lifecycle:

```text
draft -> published -> retracted
            |
            +-> corrected revision (remains published and labeled)
```

The server, never the client, supplies timestamps, author snapshots, revision
numbers and public status.

## Data and migration

Migration `0040_low_dragon_lord.sql` extends `live_events` and adds:

- `live_event_updates` for current timeline state; and
- `live_event_update_revisions` for immutable revision snapshots and reasons.

Existing `live_events` rows are migrated from `is_live`, `started_at` and
`ended_at` rather than being reset to drafts. Both new tables are included in
the encrypted portable backup and restore datasets.

## Security and operational behavior

- Public contracts omit Clerk IDs and internal actor fields.
- All newsroom routes re-check a current authenticated Studio role server-side.
- Media, source and stream values must be complete HTTPS URLs.
- Public lookup excludes drafts and retracted updates.
- Destructive actions require a reason and server-validated confirmation.
- The live page does not invent updates, audience totals or video when the
  database or stream is unavailable.
- Polling is intentionally bounded and visibility-aware, which works on Vercel
  without holding open a long-running function. A future WebSocket or event
  transport can replace it without changing the public timeline contract.

## Release procedure

1. Apply migration `0040` through the normal production migration job.
2. Sign in with separate reporter and publisher accounts.
3. Create a private desk, draft an update, and verify it is absent publicly.
4. Start the desk as a publisher, publish the draft and verify the public page,
   homepage and header update without a deployment.
5. Exercise pause/resume, correction, pin/unpin, retraction, end and archive.
6. Export a portable backup and confirm both live timeline datasets are present.
7. Validate keyboard, screen-reader announcement, dark mode, mobile PWA and
   reduced/connectivity-loss behavior before using the desk for breaking news.
