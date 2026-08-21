# Public Site V2 specification conformance

This register maps the 147-part Public Site V2 design specification to the
repository. It is a release-control artifact: **implemented** means the relevant
code path exists and is covered by repository checks; it does not replace the
real-content, browser, assistive-technology, editorial, or production approval
matrix in the operating runbook.

The implementation never invents stories, readership, legal policy, media, or
market data merely to make a proposed module appear complete.

## Coverage by specification family

| Specification sections | State | Repository implementation or remaining boundary |
| --- | --- | --- |
| 1–18 — philosophy, visual language, brand, type, grid, spacing, header and navigation | Implemented foundation | Courier-owned wordmark; independent light/dark V2 tokens; restrained type hierarchy; 1280 px editorial canvas; sticky two-level navigation; scroll-reactive material; route-aware navigation; reduced-motion support. Browser and 200% zoom approval remain release checks. |
| 19–30 — opening composition, lead photography, Breaking/Live, component family, homepage, Latest, sections and topic color | Core implemented; extended modules pending | Today opening, one dominant lead, two secondary leads, chronological Latest rail, live/breaking priority, section packages, responsive imagery and restrained desk accents are implemented. Photo-essay, markets, visual-feature, timeline, split/three-up/four-up and data-driven modules wait for explicit content contracts and Legacy mappings. |
| 31–43 — article, body, byline, trust, corrections, listening, save and share | Core implemented; media/account work pending | Dedicated article header and reading column, wide hero, structured rich copy, public notes/corrections, real authors, article-scoped progress, local text-size preference, local bookmark fallback, and consolidated Save + Share controls are implemented. Separate caption/credit fields, account synchronization and approved article audio remain pending. |
| 44–50 — Search, topic pages, clusters, explainers, related coverage and labels | Search/topic core implemented; editorial models pending | First-party header search, bounded grouped suggestions, keyboard navigation, full results, topic pages, related coverage and real story-state labels use published records only. Story clusters and explainer-specific models remain pending. Filters cannot be inferred until story-type metadata exists. |
| 51–56 — opinion, photo essays, video, visualization, elections and emergencies | Partial | Existing Opinion, Watch, video URLs, Live Desk and Breaking state continue to work. Purpose-built V2 photo essay, native media body block, chart/table, election result and emergency utility systems require structured newsroom models before their designs can ship. |
| 57–65 — notifications, personalization, privacy, account/menu interaction and motion | Partial | Existing notification controls, Clerk account boundary, adaptive appearance menu, privacy controls, dropdown/sheet interaction, focus/pressed states, restrained motion tokens and reduced-motion collapse are present. Topic following and account-backed personalization remain pending. |
| 66–88 — phone/tablet recomposition, appearance, imagery, loading/performance, web behavior, progress, tools and accessibility | Implemented foundation; production matrix pending | Phone/tablet layouts recompose instead of merely shrinking; controls meet touch sizing; responsive images, native URLs/history, semantic landmarks, visible focus, contrast and reduced motion are implemented. Real-device Safari/Chrome/Firefox, screen-reader, RTL, slow-network and 200% zoom evidence remains required before production release. |
| 89–102 — advertising, NJC+, newsletter, footer, standards, AI ideas, local utility, popularity/recommendations and resilience | Mixed, without fabricated modules | Existing ad reservations, ad-free NJC+ entitlement, newsletter, privacy consent, footer, standards, local desks, empty/error states and PWA offline recovery are retained. AI summary/Q&A, Most Read and recommendations are not rendered until approved policy and real data contracts exist. |
| 103–115 — CMS model, body blocks, Studio modules/switch, priority, editorial guidance and controls | Core switch implemented; model expansion pending | Stories remain structured and versioned; Studio provides administrator-only Legacy/V2 Preview/V2 Production control, signed comparison previews, guarded production transitions, module ordering, impact reporting and explicit Legacy-equivalence warnings. Remaining body blocks, story-priority schema and richer presentation modules are tracked in `TODO.md`. |
| 116–127 — design tokens, component states, motion, CSS foundations and page anatomy | Implemented foundation | V2 owns its colors, page/copy widths, radii, interaction states, motion behavior, responsive breakpoints and desktop/mobile composition. Optical tuning against real long headlines and photography remains part of preview approval. |
| 128–143 — pull quotes, fact boxes, documents, citations, maps, desks, quick reads, longform, history, archive, print, i18n and zoom | Partial | Structured quotes, Why It Matters, desk layouts, longform reading, browser history/scroll behavior and clean print are present. Primary documents, formal citations, maps, markets, podcast blocks, quick-read mode, explicit visited-state UI, archive tooling and internationalization require dedicated models and validation. |
| 144–147 — quality principles and final mental model | Release gate | The “quietest useful form” and editorial-hierarchy tests govern review. V2 cannot be called production-complete while any route is only using compatibility styling or while the production matrix is unsigned. |

## Route-level renderer boundary

Dedicated V2 renderers currently exist for the homepage, article, category,
Latest, Search, header/navigation, footer, and their responsive states. Shared
Live Desk functionality remains available in both presentation systems.

The other public routes remain functional within the V2 shell and token layer,
but this compatibility treatment is not represented as a ground-up redesign.
Their dedicated V2 route work is deliberately retained at the top of
`TODO.md`. Legacy remains the safe production renderer until those routes and
the production preview matrix satisfy the release gate.

## Evidence required before V2 Production

1. Real published stories covering short, long, image-light, image-heavy,
   breaking, live, opinion, correction and multi-author cases.
2. Phone, tablet, 1440 px and 1920 px desktop checks in light/dark, reduced
   motion, keyboard-only and 200% zoom modes.
3. Safari, Chrome and Firefox evidence plus iOS Safari and Android Chrome/PWA.
4. Screen-reader review of landmarks, search combobox, live state, share/save,
   article notes, progress and empty/error states.
5. Editorial approval of hierarchy, crops, headline wrapping and Legacy
   comparison; accessibility approval; explicit launch and rollback sign-off.

No environment override or preview cookie is evidence of approval by itself.
