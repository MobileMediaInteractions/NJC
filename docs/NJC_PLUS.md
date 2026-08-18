# NJC+ platform

NJC+ is a separate premium editorial network inside the Courier platform. It
shares trustworthy infrastructure—Clerk identity, Neon/Drizzle, Vercel Blob,
newsroom roles, analytics and portable backup—but it does not share the public
newspaper shell or visual system.

## Release boundary

The parent flag is `njc_plus_beta`. Its database default and application
fallback are both `false`. Child flags are:

- `njc_plus_video`
- `njc_plus_audio`
- `njc_plus_podcasts`
- `njc_plus_live`
- `njc_plus_paywalls`
- `njc_plus_trials`
- `njc_plus_access_credits`
- `njc_plus_search`
- `njc_plus_checkout`
- `njc_plus_comments`
- `njc_plus_membership_branding`
- `njc_plus_preview_club`

A child is publicly effective only when it and the parent are enabled. While the
parent is off, public pages and APIs return 404, NJC+ stays out of public
navigation and sitemaps, and checkout/redemption cannot start. Signed-in Studio
users can use `/plus?preview=studio` and content preview links. An active,
server-verified Invited Beta Tester grant is the only non-Studio exception: it
can expose only the content-facing child features explicitly selected on that
grant.

## Product architecture

`premium_content` is the shared record for stories, articles, video, shows,
episodes, clips, series, miniseries, podcasts, investigations, documentaries,
live coverage, audio, collections, topics and breaking coverage. Parent IDs,
season/episode numbers and typed relations represent hierarchy without
format-specific duplicate tables.

The public page never receives a protected media URL until
`resolvePremiumAccess()` allows the request. Valid access can originate from a
subscription, trial, manual grant, promotion, complimentary grant, content
unlock or Access Credit redemption.

Access Credit balance is computed from `access_credit_ledger`; it is not stored
as a mutable balance. Redemptions are transactional and idempotent. Manual
access and credit changes require a reason and write to `premium_audit_logs`.

## Entitlement identity and invited beta

Customer identity and content access are resolved separately. The application
keeps these records distinct:

- **NJC+ Member** — an active paid subscription;
- **NJC+ Trial** — an active trial subscription or trial grant;
- **Complimentary NJC+** — a manual, promotion, or complimentary product/tier
  grant;
- **Invited Beta Tester** — an invite-only temporary grant for a non-NJC+ user.

Invited beta grants live only in `premium_beta_tester_grants`; they are never
written into subscription or general premium-entitlement tables. Studio
controls the selected beta features, all-premium or selected-content access,
optional NJC+ member styling, start time, expiration, pause, and revocation.
Even when member styling is enabled, the account label and entitlement type
remain **Invited Beta Tester**.

The invite pool defaults to 10 concurrent active/paused records and can be
adjusted with `NJC_PLUS_INVITED_BETA_LIMIT` (hard maximum 25). Every grant is
temporary, must expire within one year, requires an audit reason, and is refused
for an existing member, trial user, or complimentary NJC+ user. Starting a
subscription/trial or granting full product/tier access converts and ends any
current beta grant without deleting its history.

The approved customer disclosure is:

> Most NJC+ beta features are included for active NJC+ members. A limited number
> of invited testers may also receive temporary access to selected beta
> features.

## Studio control plane

The top-level **NJC+** Studio area provides:

- release overview and private preview;
- unified content creation, browser recovery autosave, revisions, workflow,
  scheduling fields, media, captions, transcripts, SEO and paywall rules;
- a configurable homepage rundown;
- multiple tiers and trial/promotional offers;
- the configurable $1 / three-day offer with renewal disclosure;
- manual product/tier/content access;
- manual access extension, shortening, pause, resume and revocation;
- isolated Invited Beta Tester grants with per-feature, content, branding, and
  time-window controls;
- The Courier Cut invitation queue plus a constrained content-distribution
  choice: NJC+ only, or NJC+ and the dedicated invite host;
- the Access Credit ledger and configurable redemption-rule editor;
- comments approval, reporting and moderation history;
- first-party NJC+ traffic and playback analytics;
- a searchable append-only NJC+ audit view;
- parent and child feature flags.

The shared Media library now supports direct Blob uploads up to 500 MB, grid and
table views, search, paging, type/status/usage/trash filters, sorting, usage
counts and locations, soft deletion and restore. Permanent deletion requires a
second exact-filename confirmation, is admin-only, is audited, and is refused
when tracked references exist.

## Media and accessibility

The NJC+ video/audio player uses native media transport with an original control
surface. It supports resume sync, seeking, speed, captions, fullscreen,
picture-in-picture where available, audio skip controls, and accessible
transcripts. The implementation follows W3C WAI guidance that prerecorded video
needs captions and audio-only content needs transcripts:

- https://www.w3.org/WAI/media/av/
- https://www.w3.org/WAI/media/av/transcripts/

Studio should not publish a production until its caption/transcript review is
complete. Automated transcripts require editorial verification.

## Payments

The code provides hosted Stripe Checkout, a customer billing portal, signed and
duplicate-safe subscription webhooks, provider settlement synchronization, an
immutable operating ledger, period closes, exports and an internal Finance hub.
No live paid service or tax registration has been activated by repository
changes. Configure these only when NJC+ is approved:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- optional `STRIPE_TAX_ENABLED`
- optional `STRIPE_BILLING_PORTAL_CONFIGURATION_ID`
- a recurring Stripe Price ID on each sellable tier;
- a one-time $1 Stripe Price ID on the three-day offer;
- a webhook for `/api/webhooks/stripe`.

The $1 offer is placed on the initial subscription invoice and the tier price
starts after the configured three-day trial. Studio controls automatic renewal
and the exact public disclosure. Signed webhook events—not the browser success
page—create entitlements. See
[`FINANCE_AND_PAYMENTS.md`](FINANCE_AND_PAYMENTS.md) for accounting boundaries,
controls and the production activation procedure.

The existing Hobby-compatible daily maintenance route publishes due NJC+
productions and records Access Credit expirations as idempotent ledger
transactions. Redemption also materializes due expirations before checking a
balance, so the daily schedule cannot create an expiration loophole.

## Database and deployment

Apply `apps/web/drizzle/0016_large_hemingway.sql`,
`apps/web/drizzle/0017_natural_bullseye.sql`, and
`apps/web/drizzle/0018_mysterious_synch.sql`, followed by
`apps/web/drizzle/0019_nappy_rocket_raccoon.sql`, before enabling any flag. The
portable export contains all NJC+ tables, flags, ledgers, entitlement history,
revisions, audits and media metadata. Provider secrets are never exported.

Production activation order:

1. Apply the migration and run the full test/build suite.
2. Configure Blob for large media and Stripe in test mode.
3. Create a hidden tier and disabled $1 offer.
4. Create real programming and configure the homepage rundown.
5. Enable child flags one at a time while the parent stays off.
6. Verify private previews, captions, paywall decisions and webhook idempotency.
7. Make the tier visible and offer active.
8. Enable `njc_plus_beta` last.

`plus.thejerseycourier.com` uses host-aware rewrites to the separate product
shell. It does not redirect into the newspaper experience; while the parent
flag is off, it fails closed with the same not-found response as `/plus`.

`cut.thejerseycourier.com` is the non-indexed Courier Cut invitation portal.
It defaults to handing invited viewers into NJC+. Studio may add authorized
playback on that host, but cannot remove the same cut from NJC+ or create a
host-only release. Every cut remains bound to its title-specific invitation.

Production uses the repository-declared Node.js 22 runtime. A newer local Node
release may print an engine warning even when validation succeeds.

## Brand assets

Versioned assets live in `apps/web/public/assets/njc-plus/v1`. The manifest at
`apps/web/src/lib/njc-plus-assets.ts` is the only component-facing reference.
The signal field was generated with OpenAI image generation from an original
brief. The SVG wordmarks and icon are code-native and can be replaced without
changing page components.

## Deliberately external work

The repository cannot create live Stripe products, choose final commercial
pricing, complete legal review, produce captions, or approve public launch.
Those are operational decisions. All flags remain off until an administrator
explicitly changes them.
