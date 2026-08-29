# Approval and scheduled publication

Studio treats review, approval, and publication as separate events.

1. The owner saves a draft and submits it for review.
2. A different editor, producer, or administrator approves the exact content
   version. The approval stores the approver, timestamp, optional note,
   content version, and SHA-256 hash.
3. A publisher may publish immediately or choose an exact future instant.
4. Scheduling creates one durable queue job. The worker rechecks the approval,
   revision, content hash, required copy and media metadata, feature readiness,
   and pseudonym moderation state before committing publication.
5. A material edit cancels an open job, invalidates approval, and returns the
   story to Draft. Rescheduling and cancellation are audited separately.

## Published-story overrides

Publishing an active story permits later proposed revisions. Marking it final
closes routine editing without deleting its history. When verified new
reporting, a factual correction, a legal or safety issue, or a transparency
need requires another change, a publisher may use **Reopen with override** on
the story review page.

The override requires a classified purpose, a meaningful written reason, and
the exact typed confirmation `REOPEN STORY`. Studio records the operator,
reason, purpose, timestamp, and reopened snapshot in immutable revision and API
audit history. Applying the override does not change public copy, publication
time, byline, URL, or approval state. It only reopens the existing active-story
workspace. The proposed comparison must still be approved by a different
publisher before it replaces the live article. Disabling active-story revisions
in Configuration disables this override as well.

## Timing and recovery

Vercel Hobby retains the daily maintenance run. A public-repository GitHub
Actions workflow calls the same authenticated, idempotent worker every five
minutes at no additional hosting cost. GitHub schedules are best effort, so the
operational guarantee is **never early and normally within five minutes**, not
second-perfect delivery. A delayed or restarted worker publishes an eligible
overdue story exactly once. It holds mismatched or invalid work in Studio rather
than guessing.

Configure the same random value as `CRON_SECRET` in Vercel and
`NJC_CRON_SECRET` in GitHub Actions. Without that GitHub secret, publication
still has the daily Vercel fallback and first-reader recovery, but precise
scheduled delivery is not production-ready.

## Daylight-saving time

Studio accepts the operator's local date/time and displays both the interpreted
`America/New_York` newsroom time and the exact UTC instant. During a repeated or
skipped local hour, the UTC preview is authoritative. The publisher must verify
it before saving.

## Incident handling

Queue states are `queued`, `publishing`, `published`, `cancelled`, `blocked`,
and `failed`. Studio shows attempts and the safe error summary. Blocked work
must be reviewed and approved again; it cannot be force-published by retrying a
stale job.
