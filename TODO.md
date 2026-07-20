# NJ Courier TODO

This file tracks known follow-up work. Items here are requirements, not claims that the feature is already implemented.

## Roku — highest priority

- [ ] Create a ground-up Roku UI/UX redesign that feels like the NJ Courier website was placed directly on the television while remaining a Roku-native, remote-first application.
  - Match the site's publication identity, colors, typography hierarchy, spacing, dividers, imagery, story prominence and editorial section structure instead of using a generic Roku template.
  - Recreate the site's major experiences for a ten-foot interface: front page, latest news, sections, live coverage, weather, article reading, account state and settings.
  - Use polished, content-rich layouts and rails comparable in quality to leading streaming applications while keeping the design original to NJ Courier rather than copying Netflix or another product.
  - Pull from the same production APIs and content model as the website so placement, labels, images, breaking-news treatment and publication state remain consistent.
  - Translate hover and pointer interactions into obvious Roku focus states, predictable directional navigation and remote shortcuts without losing the site's visual character.
  - Eliminate blank cards, unexplained translucent bars, clipped labels, focus on invisible elements and layouts that appear unfinished when content is missing.
  - Create responsive Roku layouts for 720p, 1080p and 4K with television safe areas, readable long-distance typography and performant image loading.
  - Validate the redesign on real Roku hardware, not only screenshots or a simulator.
- [ ] Make full articles vertically scrollable with the Roku remote. Article body text is currently cut off below the visible screen and cannot be reached.
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

- [ ] Add editing for existing drafts and reviewed stories while preserving revision history and audit records.
- [ ] Add reviewer notes and a clear reason when a story is returned to draft.
- [ ] Add scheduling controls, timezone confirmation and a visible scheduled-publication queue.
- [ ] Finish the Studio media library: upload, browse, search, reuse, replace, caption, credit and safely delete unreferenced assets.
- [ ] Add an editorial preview for every supported presentation target, especially web, mobile, Apple TV and Roku.
- [ ] Add end-to-end tests covering create → image upload → review → return → revise → publish → update → delete.

## Reliability, security and operations

- [ ] Add production error monitoring and alerts for failed publishing, media uploads, authentication, pairing, database operations and public API requests.
- [ ] Add a documented restore drill that proves a portable database and media export can rebuild the platform in a separate account.
- [ ] Review retention, deletion and audit-log policies before accepting real employee, reader or advertiser data.
- [ ] Run periodic accessibility, performance, broken-link, SEO and security checks against production.
- [ ] Complete release signing, store credentials, notification credentials and real-device regression testing for every mobile and television app before distribution.

## Domains and launch

- [ ] Connect the final publication domain and CDN subdomain, then verify redirects, canonical URLs, feeds, sitemaps, email links, Universal Links and Android App Links.
- [ ] Connect the final domain to Google Search Console so Google can discover and index the publication.
  - Verify domain ownership using the DNS method after the domain is selected.
  - Submit the production XML sitemap and news sitemap, and confirm robots, canonical URLs and structured news metadata use the final domain.
  - Request indexing for key launch pages and monitor indexing coverage, crawl errors, removals, Core Web Vitals and search performance.
  - Treat Search Console as an indexing and diagnostics tool; do not claim or guarantee a particular search-result ranking.
- [ ] Replace remaining placeholder contact, legal-entity, newsroom and distribution details after those decisions are finalized.
- [ ] Complete a launch-day checklist covering rollback, incident response, editorial escalation, backups and status communication.

## Cross-platform appearance

- [ ] Fix system-theme detection and theme controls on every platform: web, iOS, Android, employee/admin mobile, Apple TV, Android TV and Roku.
  - Keep the saved preference (`System`, `Light` or `Dark`) separate from the effective appearance resolved from the device (`Light` or `Dark`).
  - When `System` is selected, display both the preference and resolved appearance, such as `System · Dark`.
  - Make the quick theme control adaptive and skip the explicit mode that matches the device's current system appearance.
  - If System resolves to Dark, toggle only `System (Dark) → Light → System (Dark)`; do not add a redundant Dark step.
  - If System resolves to Light, toggle only `System (Light) → Dark → System (Light)`; do not add a redundant Light step.
  - Recalculate the opposing quick-toggle option when the device's system appearance changes.
  - React to device appearance changes while the application is open when the platform supports it.
  - Persist the selection across restarts and synchronize it across a signed-in user's devices where appropriate.
  - Verify readable colors, imagery, focus states and contrast in every mode on every supported platform.

## Measurement and advertising — complete last

- [ ] Connect Google Analytics after the final domain, consent behavior and privacy disclosures are approved; validate events without collecting unnecessary personal or sensitive data.
- [ ] Select and integrate an advertising engine with responsive placements, consent controls, frequency limits, accessibility, performance budgets, editorial separation, ad labeling, reporting and an ad-free fallback when inventory fails.
