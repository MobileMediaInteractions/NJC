# Pseudonyms and public bylines

Studio keeps the account identity, public byline, and published byline snapshot
separate. A staff member may create or change only their own pseudonym. An
administrator may disable it, restore it, or require a correction with an
audited reason, but cannot silently invent a public identity for someone else.

## Before publication

- The primary author and up to seven collaborators are selected from active,
  verified Studio accounts.
- Each person is represented by their verified account name. A staff member
  may opt into only their own active pseudonym.
- Changing author order, membership, or a public byline is a material edit. It
  invalidates approval, cancels an open schedule, and returns the story to
  Draft.
- A pseudonym that is disabled or awaiting correction cannot be selected. The
  scheduler checks this again immediately before publication.

## After publication

Published stories retain immutable public-byline snapshots. Later profile or
pseudonym edits do not rewrite the archive. An editor or administrator may use
the explicit historical-correction action with a reason and confirmation. The
correction records the actor, old and new snapshots, reason, and revision in
the audit trail.

## Privacy and authority boundaries

Reader APIs, metadata, Open Graph data, JSON-LD, author pages, and the article
UI receive only public author records. Internal account IDs remain available
to authorized Studio workflows and audit records, not public responses.
Client-supplied names or pseudonym IDs are never accepted as proof that a user
may publish under another person's identity.
