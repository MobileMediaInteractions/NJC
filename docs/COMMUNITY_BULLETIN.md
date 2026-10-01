# In the Community bulletin

`/community` is the reader-facing, autumnal community event board. Its content
is newsroom-authored: reader suggestions never appear publicly just because a
form was submitted or a reviewer opened them.

## Editorial workflow

1. A reader submits event details and a follow-up email through the public
   page. The API validates the fields, accepts only HTTPS event links, applies
   an hourly connection limit, and stores the suggestion as `pending`.
2. Reporter, producer, editor, or administrator accounts with community-desk
   access can review it in Studio → Editorial → **In the Community**. Contact
   details are returned only by the authenticated Studio endpoint.
3. Staff can mark a suggestion `reviewing`, decline it, or load its details into
   the bulletin composer. Creating a bulletin from a suggestion marks it
   `approved` and creates a private draft by default.
4. A reporter may save a draft. Only an administrator, editor, or producer can
   publish, unpublish, or archive a listing. Publication is the only state
   rendered by `/community`.

The distinction between “approved” and “published” allows the newsroom to
accept an event for coverage while keeping the listing private until its
details are complete. Published notices are informational; appearing in the
bulletin is not a Courier endorsement.

## Tipline topics

The public `/tips` form now classifies tips as local government, education,
public safety, business and development, transportation, environment, health,
community, or other. Existing submissions migrate to `other`. Classification
is a newsroom triage aid only; it does not imply verification, public status,
or automatic assignment. The public form continues to warn readers not to use
it for sensitive material.

## Data and safeguards

- `community_bulletins` contains editorially managed public copy and workflow
  metadata.
- `community_event_submissions` contains unverified reader suggestions,
  including optional contact details; it is never queried by the public page.
- The Studio API enforces Clerk newsroom identity, role, Studio module
  configuration, and a database-backed update path. Publishing requires
  `admin`, `editor`, or `producer`; reporters can prepare drafts and review
  submissions.
- Public requests are validated server-side, have a honeypot and an
  Upstash-backed per-connection hourly limit (with a process-local fallback
  when Redis is not configured). Error logs do not include submitted payloads.
- Event datetimes are converted from the submitting/editor's device timezone to
  an absolute timestamp; readers see listing times formatted in the configured
  publication timezone.
- No fixture or sample events are seeded. An empty database displays an honest
  empty state.
- No retention period for rejected/old event suggestions or submitter contact
  information has been approved. Keep it within Studio access controls until a
  newsroom/privacy owner sets the retention schedule tracked in `TODO.md`.
- The database backup export includes both new tables, so portable backups
  retain the bulletin and its unapproved queue.

## Deployment

Migration `0041_shiny_ulik.sql` adds the topic column and the two
community tables. The normal production deployment migration hook applies it.
The feature and Studio workspace can be disabled separately in Studio →
Configuration. Keep the public feature off if the production migration has not
yet been applied. Screenshots are intentionally pending until the deployed
empty state or real, editor-approved listings can be captured safely.

The event intake requires Postgres. For a distributed rate-limit shared across
Vercel instances, configure the existing Upstash Redis integration; without it,
the fallback limit is process-local and should not be treated as a global abuse
control.
