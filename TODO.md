# NJ Courier TODO

This file tracks known follow-up work. Items here are requirements, not claims that the feature is already implemented.

## Roku — highest priority

- [ ] Create a ground-up Roku UI/UX redesign that reproduces the NJ Courier website's design direction and editorial experience as closely to 1:1 as practical while being genuinely designed, built and tested for television.
  - Preserve the original product direction: “If Netflix can get a design like that, we need to get a full matched UI/UX as the site itself. It needs to look like Roku got a browser and we just took the site and went *plop*.”
  - Use Netflix as an explicit benchmark for television-grade quality. The finished Roku experience must match or exceed that level of polish, responsiveness, focus clarity, navigation confidence, content presentation and perceived completeness.
  - Do not copy Netflix's branding or layouts. Apply that standard of execution to an original NJ Courier experience whose visual and editorial direction comes directly from the website.
  - The finished interface must not look like a stock or “native-looking” Roku channel. Build a distinct visual system from the ground up with custom components, transitions, focus treatments, navigation behavior, loading states and editorial layouts.
  - Use Roku's supported platform APIs underneath without allowing default widgets, templates or platform styling to define the visible experience. Any necessary native control must be wrapped, restyled or visually integrated into the NJ Courier system.
  - Treat the website as the visual and editorial source of truth: match its publication identity, colors, typography hierarchy, spacing, dividers, imagery, story prominence, section structure and overall character instead of using a generic Roku template.
  - Do not achieve the 1:1 appearance by embedding a website, imitating mouse interactions or simply scaling a desktop layout. Recreate it as a custom television interface with remote-appropriate behavior.
  - Use platform-supported hardware acceleration and hardware-aware techniques where they materially improve the experience: compositor-friendly transforms, efficient texture and image reuse, prefetching, caching, virtualized content rails, bounded animation work and graceful degradation on slower Roku hardware.
  - Establish measurable launch, navigation, animation, memory and image-loading budgets, then profile them on both lower-powered and current Roku devices. Visual ambition must not produce delayed input, dropped focus events, stutter or crashes.
  - Adapt density, typography, safe areas, focus treatment, navigation depth, reading width, animation and information hierarchy for a ten-foot viewing distance and directional remote input.
  - Every interactive element must have an obvious focused state, a predictable remote path and a sensible Select or Back action; nothing may depend on hover, touch, scrolling gestures or a pointer.
  - Recreate the site's major experiences for a ten-foot interface: front page, latest news, sections, live coverage, weather, article reading, account state and settings.
  - Use polished, content-rich layouts and rails that feel deliberate and complete on television, including when feeds are sparse, stories lack imagery or network content is still loading.
  - Pull from the same production APIs and content model as the website so placement, labels, images, breaking-news treatment and publication state remain consistent.
  - Translate hover and pointer interactions into obvious Roku focus states, predictable directional navigation and remote shortcuts without losing the site's visual character.
  - Eliminate blank cards, unexplained translucent bars, clipped labels, focus on invisible elements and layouts that appear unfinished when content is missing.
  - Create responsive Roku layouts for 720p, 1080p and 4K with television safe areas, readable long-distance typography and performant image loading.
  - Validate the redesign on real Roku hardware, not only screenshots or a simulator.
- [ ] Make the Roku experience mirror the live configuration managed in Studio instead of maintaining a separate hardcoded set of tabs, labels and features.
  - Consume the same audited production configuration API used by the website, extending the shared contract only where a television-specific presentation value is genuinely required.
  - Match Studio's configured navigation visibility, labels and order. Disabling, enabling, renaming or reordering a supported website tab must produce the corresponding Roku change without a channel rebuild or reinstall.
  - Apply shared feature flags consistently. For example, disabling Live video or Weather in Studio must remove its Roku navigation and entry points rather than leaving an empty or broken screen.
  - Preserve platform-appropriate presentation: the configuration decides what content and features exist, while the custom television design decides how they are arranged and controlled.
  - Refresh configuration on launch, resume and a bounded background interval; use a validated last-known-good configuration during temporary network failures.
  - Version and validate configuration responses, reject unsafe or unsupported destinations, and fall back gracefully when a web-only navigation item has no television equivalent.
  - Add cross-platform contract tests proving that representative Studio changes produce equivalent website and Roku availability while preserving Roku-specific layout and focus behavior.
- [ ] Make full articles vertically scrollable with the Roku remote. Article body text is currently cut off below the visible screen and cannot be reached.
  - Fix the current overlay-focus defect first: after an article opens, the remote still moves and activates the story rail or navigation behind the article instead of controlling the article reader.
  - Treat the article reader as a modal focus scope. It must capture Up, Down, Fast Forward, Rewind, Select and Back while open, and no hidden control behind it may receive those events.
  - Up and Down must scroll the article without unexpectedly moving focus back to the navigation or another story.
  - Fast Forward and Rewind may provide page-sized scrolling if that matches Roku interaction conventions.
  - Show a subtle scroll-position indicator so viewers know more content is available.
  - Keep headlines, metadata, lead images and body copy inside television safe areas at 720p, 1080p and 4K.
  - Preserve the reader's position when focus temporarily moves to an article action.
  - Back must return to the previous story list and restore the previously selected story.
  - Test unusually long headlines, long-form stories, articles without images and articles containing many paragraphs.
- [ ] Complete a real-hardware Roku accessibility and remote-navigation pass, including focus visibility, readable type size, contrast, overscan and screen-reader labels where Roku supports them.
- [ ] Add clear Roku loading, offline, retry, empty-feed and API-error states instead of leaving partially populated layouts on screen.
- [ ] Verify account pairing survives channel restarts, expires safely and removes all sign-in prompts after connection.
- [ ] Verify newly published, updated and deleted stories refresh correctly on Roku without reinstalling the channel.

## Secure QR and code pairing — all platforms

- [ ] Add an explicit secure processing state after a QR code is scanned on Roku, Apple TV, Android TV, web quick sign-in and every other pairing surface.
  - Generate a new QR code and human-readable sync code every 60 seconds while the code is waiting to be scanned, with a visible countdown where appropriate.
  - As soon as the server recognizes a legitimate scan, freeze that QR code, sync code and countdown so the on-screen identity cannot rotate during authentication.
  - Blur the frozen QR code and place a loading spinner inside its bounds to clearly show that authentication is being processed.
  - Disable repeated scans, code reuse and conflicting pairing attempts while that frozen request is pending.
  - Bound the frozen processing state with a secure server-controlled timeout; if authentication fails or expires, explain the failure and issue a fresh single-use code.
  - Validate pairing state, code lifetime, nonce and requesting device on the server; never trust a client-only scanned or authenticated flag.
  - After successful authentication, replace the entire screen with an unambiguous authenticated-success view.
  - Keep the success screen visible for five seconds, then refresh the account/session state and return to the exact screen, selected item and navigation position shown before pairing began.
  - If the original destination no longer exists, return to the closest safe landing screen and explain what changed.
  - Test success, denial, expiration, network loss, app restart, duplicate scan and revoked-account behavior without exposing credentials or sensitive account information.

## Newsroom and publishing

- [ ] Redesign Studio’s **Users & roles** directory with role-based tabs for All accounts, Readers, Contributors, Reporters, Producers, Editors and Administrators, with Alpha and Beta filters added when release-channel management is implemented.
  - Find and implement a reliable server-side filtering and counting approach that covers the complete Clerk directory, not only the 25 accounts loaded on the current page.
  - Each tab must show an accurate total, retain search and pagination, and update immediately after an administrator changes a role.
  - Keep account status, presence, platform, last-active time and security indicators visible without turning the directory into an unreadable table.
  - Audit release-channel changes with the same rigor already used for profile and role changes.
  - Add production tests proving that accounts cannot disappear between tabs, role changes cannot be forged by the client and reader accounts remain visible.
- [ ] Add reviewer notes and a clear reason when a story is returned to draft.
- [ ] Add scheduling controls and timezone confirmation to the editorial workflow, connected to the existing scheduled-publication queue and publisher.
- [ ] Finish the Studio media library: browse, search, reuse, replace, caption, credit and safely delete unreferenced assets.
- [ ] Add editorial presentation previews for mobile, Apple TV, Android TV and Roku.
- [ ] Add end-to-end tests covering create → image upload → review → return → revise → publish → update → delete.

## Reliability, security and operations

- [ ] Add production error monitoring and alerts for failed publishing, media uploads, authentication, pairing, database operations and public API requests.
- [ ] Add a documented restore drill that proves a portable database and media export can rebuild the platform in a separate account.
- [ ] Review retention, deletion and audit-log policies before accepting real employee, reader or advertiser data.
- [ ] Run periodic accessibility, performance, broken-link, SEO and security checks against production.
- [ ] Complete release signing, store credentials, notification credentials and real-device regression testing for every mobile and television app before distribution.

## Domains and launch

- [ ] Confirm Google has refreshed the production `robots.txt`, successfully read both submitted sitemaps and made homepage indexing requests available.
- [ ] Finish final-domain launch verification for `https://www.thejerseycourier.com/`: redirects, canonical URLs, feeds, sitemaps, email links, Universal Links and Android App Links.
- [ ] Provision the optional asset CDN subdomain and switch `NEXT_PUBLIC_ASSET_ORIGIN` only after its asset manifest and fallback behavior are verified.
- [ ] Connect `thejerseycourier.com` to Google Search Console so Google can discover and index the publication.
  - Verify domain ownership using the DNS method.
  - Submit the production XML sitemap and news sitemap, and confirm robots, canonical URLs and structured news metadata use `https://www.thejerseycourier.com/`.
  - Request indexing for key launch pages and monitor indexing coverage, crawl errors, removals, Core Web Vitals and search performance.
  - Treat Search Console as an indexing and diagnostics tool; do not claim or guarantee a particular search-result ranking.
- [ ] Replace remaining placeholder contact, legal-entity, newsroom and distribution details after those decisions are finalized.
- [ ] Complete a launch-day checklist covering rollback, incident response, editorial escalation, backups and status communication.

## Measurement and advertising — complete last

- [ ] Connect Google Analytics after the final domain, consent behavior and privacy disclosures are approved; validate events without collecting unnecessary personal or sensitive data.
- [ ] Create and approve the external AdSense account, register the production domain, configure a Google-certified consent message, create ad units, review Google’s site approval, then enter the real publisher and slot IDs in Studio before disabling Preview mode.
- [ ] After live inventory is approved, validate consent withdrawal, reporting, fill failures, accessibility, layout shift, Core Web Vitals, placement policy compliance and reasonable ad density on real desktop and mobile pages.
