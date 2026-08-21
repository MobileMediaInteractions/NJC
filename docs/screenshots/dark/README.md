# Dark-mode screenshot library

This folder is the August 18, 2026 production/documentation capture set. Public
web pages use the live Courier system-dark presentation at a 1440×900 desktop
viewport. Mobile client images use a 390×844 viewport. Local workbench captures
come from the checked-out implementation and are labeled as such in their
owning README.

The complete route-to-image mapping is maintained in
[`apps/web/PAGES.md`](../../../apps/web/PAGES.md). Application ownership is
indexed in [`apps/README.md`](../../../apps/README.md), while source-only shared
workspaces are indexed in [`packages/README.md`](../../../packages/README.md).

## Publication

![Homepage](web-home.jpg)

![Published story](web-story.jpg)

![Legal center](web-legal.jpg)

## Public Site V2 verification

These four captures were recorded from the checked-out V2 renderer on August
21, 2026 with `SITE_DESIGN_OVERRIDE=v2`. Desktop captures use a 1440×900
viewport and the phone capture uses 390×844. The browser was in its
system-dark appearance. The local editorial database contained no published
stories, so the homepage, search and Saved Stories images preserve the real
empty/no-match states instead of introducing sample reporting.

![V2 desktop homepage with the verified empty newsroom state](web-v2-home-desktop.png)

![V2 search dialog for the non-sensitive query Middlesex](web-v2-search-dialog.png)

![V2 Saved Stories empty state](web-v2-saved-empty.png)

![V2 mobile homepage](web-v2-home-mobile.png)

## Services and protected boundaries

![Press portal](press-portal.jpg)

![Status dashboard](status-dashboard.jpg)

![Studio access boundary](studio-access.jpg)

## Clients and developer workbenches

![Mobile reader](mobile-reader.jpg)

![Platform playground](platform-playground.jpg)

![Visual Feature Playground](visual-feature-playground.jpg)

![Portable media player SDK](media-player-sdk-viewer.jpg)

![Portable timeline SDK](media-player-sdk-timeline.jpg)

## Safety rules

- Never capture authenticated staff, reader, financial, analytics, entitlement
  or unreleased editorial data for public repository documentation.
- Never capture active pairing codes, package tokens, API keys or private URLs.
- Represent protected route families with their public access boundary.
- Represent disabled releases with their real release-gate destination.
- Replace a capture when the corresponding page changes materially, and update
  its route description in the same commit.
