# NJC+ timeline, platform intro and Preview Club

## Implemented architecture

Migration `0038_noisy_omega_sentinel.sql` adds one shared source-timeline model and the records required for global intros and private preview review.

- `premium_timeline_segments` stores millisecond ranges against the underlying program. It supports `intro`, `recap`, `credits` and `custom`; custom labels and future metadata do not require a schema rewrite.
- `premium_platform_intros` retains historical ident assets while a partial unique index permits only one active row. The active intro is resolved at playback time.
- `premium_content.is_original` classifies first-party productions. `global_intro_enabled` is the per-title opt-out and defaults on.
- `premium_preview_configurations`, `premium_preview_invitations`, `premium_preview_questions` and `premium_preview_responses` provide the invitation, time window, viewing state and structured-feedback boundary.

Source markers never include inherited media. `composePlaybackTimeline()` calculates an effective playback offset from the active intro duration plus its configured black/silence gap. Changing an eight-second intro to an eleven-second intro shifts the presentation by three seconds without rewriting a content marker.

## Studio operations

1. Upload ordinary release media through **Media → Upload media**.
2. Upload unreleased cuts through **Media → Upload private preview**. This uses the separate private Vercel Blob credential and records the asset as private.
3. Open **NJC+ → Platform intros**, register a public video asset, enter its measured duration and select **Activate**. Activating a new ident makes the previous ident inactive atomically.
4. Open an NJC+ video production. Mark it as an **NJC+ original production** and leave **Play global platform intro** enabled, or opt out for that title.
5. Use the visual source timeline to scrub, add markers, zoom long programs, drag each range handle, set exact millisecond boundaries, preview a bounded range, discard unsaved edits or save the source timeline.
6. Enable Preview Club only after attaching a private media asset. Configure the availability window, viewer warning and optional questions, then search the Clerk directory and invite specific accounts.
7. Use **NJC+ → Preview Club** for the aggregate queue. The individual production remains the authoritative management surface and shows named invitees, watch state, response counts, average rating and each submitted answer.

The release flag `njc_plus_preview_club` must be enabled in **NJC+ → Feature flags** before invited viewers can enter. This flag does not grant anyone access; every viewer must also have an active content-specific invitation.

## Player behavior

The web player remains one visible media element and one control surface. For an eligible original it presents:

1. active platform intro;
2. the configured black/silence transition (2.5 seconds by default);
3. source program.

**Skip Intro** during the platform ident enters the source program immediately and omits the black gap. Program markers are translated into the composed presentation while seeks and persisted progress remain source-relative. Intro, recap and custom skip controls reappear after a manual rewind and disappear outside their half-open ranges. Credits are first-class markers and can be made skippable, but this change does not invent a separate autoplay system.

The public content API now supplies the source markers and resolved platform-intro presentation to supported clients. Native and television players must implement the same composition contract before claiming platform parity.

## Preview security

- Preview content remains unpublished and is absent from ordinary catalog queries, search, recommendations, feeds, sitemap output and the public content API.
- Preview page, feedback, listing and range-streaming routes all require a verified Clerk account and an active content-specific invitation.
- Disabled, future, expired or revoked grants fail as not found.
- Private assets are read through a request-authorized range proxy with `private, no-store` and `noindex, nofollow, noarchive` headers. Storage pathnames and private credentials are never returned.
- Preview progress updates the existing watch-progress record and the invitation viewing state. Feedback accepts only question IDs belonging to that preview.
- Publishing rejects private media. Staff must attach a public release asset before a production can become published.

## Current media constraint

The repository has Vercel Blob storage and a custom HTML media player, but no transcoding vendor, HLS/DASH packager, alternate-audio model or manifest-stitching service. The web implementation therefore performs non-destructive single-player source switching behind one persistent control surface. It preserves source masters, captions on the program, progress and timeline behavior, but cannot truthfully promise gapless adaptive-bitrate transitions between two independently encoded Blob files.

When a transcoding provider is selected, generate a composed HLS/DASH presentation from compatible renditions and keep this database/timeline contract unchanged. Do not physically burn an ident into the only source master.

## Production validation

Run migration `0038`, configure `PRIVATE_BLOB_READ_WRITE_TOKEN`, enable `njc_plus_preview_club`, and perform the real-account, browser, fullscreen, seek, range-request, expiration and revocation matrix in `TODO.md`. Validate that private media was uploaded into the private store before inviting anyone.
