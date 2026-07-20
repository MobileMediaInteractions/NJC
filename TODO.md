# NJ Courier TODO

This file tracks known follow-up work. Items here are requirements, not claims that the feature is already implemented.

## Roku — highest priority

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
- [ ] Replace remaining placeholder contact, legal-entity, newsroom and distribution details after those decisions are finalized.
- [ ] Complete a launch-day checklist covering rollback, incident response, editorial escalation, backups and status communication.

## Measurement and advertising — complete last

- [ ] Connect Google Analytics after the final domain, consent behavior and privacy disclosures are approved; validate events without collecting unnecessary personal or sensitive data.
- [ ] Select and integrate an advertising engine with responsive placements, consent controls, frequency limits, accessibility, performance budgets, editorial separation, ad labeling, reporting and an ad-free fallback when inventory fails.
