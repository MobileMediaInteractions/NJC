# Public Site V2

Public Site V2 is an independent, request-time presentation system for The New
Jersey Courier. It shares stories, live desks, authors, accounts, analytics,
advertising policy, URLs and SEO metadata with Legacy. It does not copy or
rewrite editorial data.

## Release states

Studio **Configuration → Site design** exposes three states:

- **Legacy** — the original public visual system remains the production
  renderer. Shared product capabilities such as Live Desk may appear in both
  renderers without turning Legacy into V2.
- **V2 Preview** — production remains Legacy while signed-in staff can compare
  V2 and Legacy using four-hour, signed, HTTP-only preview cookies.
- **V2 Production** — V2 becomes the request-time production renderer. Staff
  can still open a signed Legacy preview for regression comparison.

The preview endpoint re-checks a current Studio role and signs the selected
renderer with `SITE_DESIGN_PREVIEW_SECRET`, or the configured Clerk server
secret when a dedicated signer is not supplied. On the production subdomains,
the cookie is scoped to `.thejerseycourier.com` so a preview started in Studio
continues on the primary publication domain. Arbitrary client values are not
trusted. On `njc-web.vercel.app` and local development hosts, preview remains
on that same request origin because those hosts cannot set a Courier-domain
cookie. Protocol-relative and external return destinations are rejected.

`SITE_DESIGN_OVERRIDE=legacy|v2` is available for an isolated preview or
staging deployment. Omit it from ordinary production so Studio configuration
remains authoritative. Studio surfaces an active override because it takes
precedence over the saved production release state for ordinary public
requests; signed staff previews can still compare both renderers.

## V2 system

V2 supplies its own semantic light/dark tokens, restrained global header,
responsive navigation sheet, wordmark, footer, homepage compositions, story
primitives, dedicated section/Latest/Search layouts, article reading
system, optional trust panel and article-scoped reading progress,
reduced-motion behavior and print styles.

### Current route coverage

The homepage, category sections, Latest, Search results, local Saved library
and article reader have dedicated V2 renderers. Live and the remaining public routes still
use the existing route implementation inside the V2 shell/token treatment so
their content and URLs continue to work during migration. That compatibility
layer is not a completed V2 redesign; route-specific renderers and their empty,
loading, error, offline and not-found states remain tracked in `TODO.md`.

Search is a first-class V2 surface. The restrained header dialog opens from the
Search control, `Command/Ctrl+K` or `/`, traps focus, closes with Escape, and
offers a WAI-ARIA combobox with arrow-key/Return selection. A 200 ms debounce
begins after two characters. Its bounded endpoint is protected by the existing
first-party reader origin and rate-limit policy, validates every query
server-side, excludes unpublished and `noIndex` records, and derives grouped
Topic, People and Story suggestions only from actual published story metadata.
The client also rejects malformed or non-local destinations before rendering.
The server-rendered `/search?q=` page remains the durable URL, no-JavaScript
fallback and complete-results destination. Content-type filters still wait for
explicit analysis/video/photo metadata rather than guessing a story's
editorial classification.

Saved Stories is a progressive, private browser feature at `/saved`. It accepts
only validated same-origin `/story/[slug]` bookmarks, resolves every entry
through the authorized public reader API, and exposes loading, empty, missing,
retry and removal states. Account-backed cross-device synchronization remains
future work and is not implied by this local library.

### Verified public captures

The dark-mode documentation set includes public, unauthenticated V2 captures
at the required desktop and phone viewports:

- [Desktop homepage](../screenshots/dark/web-v2-home-desktop.png) — 1440×900.
- [Search dialog](../screenshots/dark/web-v2-search-dialog.png) — 1440×900,
  using the non-sensitive query `Middlesex`.
- [Saved Stories empty state](../screenshots/dark/web-v2-saved-empty.png) —
  1440×900.
- [Mobile homepage](../screenshots/dark/web-v2-home-mobile.png) — 390×844.

These are checked-out-renderer verification images, not production-content
claims. The local editorial database contained no published stories, so the
captures retain the genuine empty and no-match states and do not use fixtures
or dummy reporting. No authenticated or private surfaces were captured.

The system uses Courier identity and assets. “Apple-inspired” refers to the
approved principles—hierarchy, typography, spacing, restraint and
platform-quality interaction—not Apple trademarks, logos, copyrighted assets
or a clone of an Apple product.

## Homepage composition

Administrators can order, enable and disable approved V2 modules without
exposing CSS. Other approved Studio roles can use the signed comparison
previews, but cannot mutate production configuration:

1. Live and breaking
2. Primary lead
3. Secondary leads
4. Latest rail
5. Section packages
6. Newsletter

The renderer recomposes the same module for desktop, tablet and phone. Legacy
uses its established fixed homepage hierarchy and shares the same published
stories and Live Desk state; it does not consume V2 module order. Studio shows
this lack of a one-to-one Legacy equivalent beside the composition controls.

Entering or leaving **V2 Production** requires the normal change reason plus
the typed `APPLY PRODUCTION CHANGE` confirmation. Every successful save keeps
the previous and current configuration in revision history and records the
selected design state in the API audit trail.

## Performance and accessibility

Homepage, section, article and search content remains server-rendered. Only
interactive navigation, saved/share actions, theme selection and reading
progress hydrate. Images use responsive delivery, explicit geometry and
below-fold lazy loading. Live motion and image transitions collapse under
`prefers-reduced-motion`.

Both renderers retain normal URLs, browser history, refresh, deep links,
canonical metadata and structured data. V2 includes one meaningful `h1`, a
skip link, logical landmarks, visible focus, descriptive images, labeled live
state, accessible status output and clean print behavior.

## Release checklist

1. Save **V2 Preview** in Studio with an explicit change reason.
2. Compare the homepage, a section, Search, Latest and representative
   articles in both signed preview modes. Verify Live and other transitional
   routes for compatibility, without treating their shell styling as a
   completed V2 redesign.
3. Test Safari, Chrome and Firefox plus iOS Safari and Android Chrome at phone,
   tablet, desktop, 200% zoom, dark mode and reduced motion.
4. Validate real editorial image crops and long/RTL/translatable headlines.
5. Confirm Web Vitals, analytics, ad reservation, canonical URLs, structured
   data, print, keyboard navigation and screen-reader output.
6. Save **V2 Production**, verify without a preview cookie, and retain the
   immediate Legacy rollback control through the launch window.
