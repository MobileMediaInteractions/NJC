# Web page and screenshot inventory

This inventory covers every human-facing route family in `apps/web`. Captures
were taken from the production route on August 18, 2026 at a 1440×900 desktop
viewport with the Courier's system-dark appearance, except the explicitly
mobile client captures. API routes, metadata routes, feeds, sitemaps and image
renderers are contracts rather than pages and are documented by their owning
runbooks and tests.

## Publication and discovery

| Route | Purpose | Dark-mode capture |
| --- | --- | --- |
| `/` | Front page and primary edition briefing | ![Homepage](../../docs/screenshots/dark/web-home.jpg) |
| `/latest` | Reverse-chronological newsroom index | ![Latest](../../docs/screenshots/dark/web-latest.jpg) |
| `/search` | Reader search and result states | ![Search](../../docs/screenshots/dark/web-search.jpg) |
| `/story/[slug]` | Published article template; capture uses a real published story | ![Story](../../docs/screenshots/dark/web-story.jpg) |
| `/author/[slug]` | Public contributor archive; capture uses Abdullah Muzammil | ![Author](../../docs/screenshots/dark/web-author.jpg) |
| `/staff` | Published staff directory; with no opted-in profiles it redirects home | ![Empty staff redirect](../../docs/screenshots/dark/web-staff-empty.jpg) |

## News desks

| Route | Desk | Dark-mode capture |
| --- | --- | --- |
| `/category/middlesex` | Middlesex County reporting | ![Middlesex](../../docs/screenshots/dark/web-category-middlesex.jpg) |
| `/category/statehouse` | Trenton and statewide government | ![Statehouse](../../docs/screenshots/dark/web-category-statehouse.jpg) |
| `/category/public-square` | Polling and civic engagement | ![Public Square](../../docs/screenshots/dark/web-category-public-square.jpg) |
| `/category/opinion` | Garden State Forum commentary | ![Opinion](../../docs/screenshots/dark/web-category-opinion.jpg) |
| `/category/sports` | Jersey Gridiron & Court | ![Sports](../../docs/screenshots/dark/web-category-sports.jpg) |
| `/category/jersey-laurels` | Jersey Laurels recognition | ![Jersey Laurels](../../docs/screenshots/dark/web-category-jersey-laurels.jpg) |
| `/category/[slug]` | Shared category template for configured future desks | Uses the matching configured desk capture above |

## Community, service and newsroom programs

| Route | Purpose | Dark-mode capture |
| --- | --- | --- |
| `/20-under-20` | Annual student recognition program | ![20 Under 20](../../docs/screenshots/dark/web-20-under-20.jpg) |
| `/tips` | Secure news-tip intake | ![Tips](../../docs/screenshots/dark/web-tips.jpg) |
| `/newsletter` | Newsletter and alert registration | ![Newsletter](../../docs/screenshots/dark/web-newsletter.jpg) |
| `/weather` | Local weather surface | ![Weather](../../docs/screenshots/dark/web-weather.jpg) |
| `/live` | Live coverage state | ![Live](../../docs/screenshots/dark/web-live.jpg) |
| `/watch` | Video and watch surface | ![Watch](../../docs/screenshots/dark/web-watch.jpg) |
| `/advertise` | Advertising information | ![Advertise](../../docs/screenshots/dark/web-advertise.jpg) |
| `/about` | Publication identity and mission | ![About](../../docs/screenshots/dark/web-about.jpg) |
| `/press` | Original main-domain press-kit workflow | ![Press kit](../../docs/screenshots/dark/web-press-kit.jpg) |
| `/offline` | PWA offline recovery state | ![Offline](../../docs/screenshots/dark/web-offline.jpg) |

## Legal and trust center

| Route | Purpose | Dark-mode capture |
| --- | --- | --- |
| `/legal` | Legal and trust index | ![Legal](../../docs/screenshots/dark/web-legal.jpg) |
| `/privacy` | Privacy policy | ![Privacy](../../docs/screenshots/dark/web-privacy.jpg) |
| `/terms` | Terms of use | ![Terms](../../docs/screenshots/dark/web-terms.jpg) |
| `/cookies` | Cookie policy | ![Cookies](../../docs/screenshots/dark/web-cookies.jpg) |
| `/community-guidelines` | Community participation rules | ![Community guidelines](../../docs/screenshots/dark/web-community-guidelines.jpg) |
| `/dmca` | Copyright and DMCA process | ![DMCA](../../docs/screenshots/dark/web-dmca.jpg) |
| `/accessibility` | Accessibility statement | ![Accessibility](../../docs/screenshots/dark/web-accessibility.jpg) |
| `/data-requests` | Privacy request intake | ![Data requests](../../docs/screenshots/dark/web-data-requests.jpg) |
| `/api-terms` | Public API terms | ![API terms](../../docs/screenshots/dark/web-api-terms.jpg) |
| `/developer-agreement` | Developer agreement | ![Developer agreement](../../docs/screenshots/dark/web-developer-agreement.jpg) |
| `/standards` | Editorial standards and corrections | ![Standards](../../docs/screenshots/dark/web-standards.jpg) |

## Identity and device pairing

| Route | Purpose | Safe capture |
| --- | --- | --- |
| `/sign-in/[[...sign-in]]` | Reader sign-in and provider callback states | ![Sign in](../../docs/screenshots/dark/web-sign-in.jpg) |
| `/sign-up/[[...sign-up]]` | Reader account creation and provider callback states | ![Sign up](../../docs/screenshots/dark/web-sign-up.jpg) |
| `/profile/[[...profile]]` | Account management; signed-out requests preserve the destination and route to sign-in | ![Profile auth boundary](../../docs/screenshots/dark/web-profile-auth.jpg) |
| `/login/quick` | QR-assisted quick sign-in | ![Quick sign-in](../../docs/screenshots/dark/web-login-quick.jpg) |
| `/login/tv` | Manual television pairing | ![TV pairing](../../docs/screenshots/dark/web-login-tv.jpg) |

No screenshot contains an active pairing code, token or authenticated account.

## Dedicated host surfaces

| Host/route family | Behavior | Safe capture |
| --- | --- | --- |
| `press.*` and `/press-portal` | AI-assisted Press & Media intake | ![Press portal](../../docs/screenshots/dark/press-portal.jpg) |
| `distribution.*` and `/distribution/**` | Authorized pre-publication package viewer | ![Distribution](../../docs/screenshots/dark/distribution-portal.jpg) |
| `links.*`, `/link-in-bio`, `/link-in-bio/[slug]` | Curated social landing page and audited story redirect | ![Links](../../docs/screenshots/dark/link-in-bio.jpg) |
| `api.*` and `/developers` | Developer account/key entry; signed-out requests route to auth | ![Developer auth](../../docs/screenshots/dark/api-developer-entry.jpg) |
| `studio.*` and `/studio/**` | Permission-aware newsroom operations | ![Studio access boundary](../../docs/screenshots/dark/studio-access.jpg) |
| `plus.*` and `/plus/**` | NJC+ page family; the disabled release gate currently redirects to the publication | ![NJC+ release gate destination](../../docs/screenshots/dark/plus-release-gate.jpg) |
| `cut.*`, `/courier-cut`, and authorized cut detail rewrites | Invitation-only Courier Cut portal; the release boundary uses the NJC+ gate and account-specific invitation checks | ![NJC+ release gate destination](../../docs/screenshots/dark/plus-release-gate.jpg) |
| `/employee-link/v1/[...path]` | Main-app handoff into the employee app | Uses the employee-app access boundary in `apps/employee/README.md` |

Studio detail pages, Distribution items/packages, Press request histories and
NJC+ member pages are intentionally represented by their signed-out or disabled
boundary. Capturing their interior would require publishing private account,
editorial, financial or entitlement data. When approved fixture accounts and a
redaction procedure exist, those captures can be added without weakening this
rule.

## Complete protected Studio page map

Every route below resolves through the same server-side identity, active-account
and capability checks before its page component can expose data. The safe
signed-out state for every row is this capture:

![Studio access boundary shared by protected pages](../../docs/screenshots/dark/studio-access.jpg)

| Route | Responsibility |
| --- | --- |
| `/studio` | Newsroom overview |
| `/studio/stories` | Editorial queues |
| `/studio/stories/new` | Story creation and WYSIWYG workflow |
| `/studio/stories/[id]` | Story review, approval and revision history |
| `/studio/stories/[id]/edit` | Pre-publication or active-story editing |
| `/studio/tips` | Submitted-tip triage |
| `/studio/media` | Public/private media catalog |
| `/studio/20-under-20` | Program, nomination and selection controls |
| `/studio/legal` | Severity-gated legal-center changes |
| `/studio/links` | Link in Bio curation |
| `/studio/analytics` | Audience analytics and audit evidence |
| `/studio/notifications` | Segmented site-notification composer |
| `/studio/chat` | Internal team communication |
| `/studio/team` | Account and role directory |
| `/studio/team/[id]` | Individual profile and permissions |
| `/studio/profile` | Signed-in employee profile and pseudonym |
| `/studio/commands` | Studio command reference |
| `/studio/exports` | Portable database exports |
| `/studio/settings` | Versioned site configuration |
| `/studio/settings/domains` | Locked domain provisioning controls |
| `/studio/distribution` | Pre-publication package administration |
| `/studio/distribution/[id]` | Package contents and grants |
| `/studio/press` | Press-request review queue |
| `/studio/press/[id]` | Press decision, assets, license and audit |
| `/studio/press-releases` | Press-release document library |
| `/studio/press-releases/new` | Press-release authoring |
| `/studio/press-releases/[id]` | Press-release editing and PDF generation |
| `/studio/finance` | Finance overview |
| `/studio/finance/ledger` | Ledger and categorized transactions |
| `/studio/finance/reconciliation` | Reconciliation workflow |
| `/studio/finance/settings` | Reporting identity and set-aside policy |
| `/studio/njc-plus` | NJC+ operations overview |
| `/studio/njc-plus/access` | Membership, trial and invited-beta entitlements |
| `/studio/njc-plus/analytics` | NJC+ audience metrics |
| `/studio/njc-plus/audit` | Premium-access audit trail |
| `/studio/njc-plus/comments` | Member-comment moderation |
| `/studio/njc-plus/commerce` | Catalog, payment and subscription operations |
| `/studio/njc-plus/content` | Premium content library |
| `/studio/njc-plus/content/new` | Premium content authoring |
| `/studio/njc-plus/content/[id]` | Premium content editing and timeline |
| `/studio/njc-plus/credits` | Credit and redemption controls |
| `/studio/njc-plus/flags` | Feature and cohort controls |
| `/studio/njc-plus/homepage` | NJC+ homepage composition |
| `/studio/njc-plus/intros` | Global original-content intros |
| `/studio/njc-plus/previews` | Invited preview program administration |
| `/studio/sign-in/[[...sign-in]]` | Studio-specific authentication recovery |

## Complete NJC+ reader page map

The release flag currently sends every public entry to the canonical
publication. That real destination is captured below; it is not presented as a
launched premium page.

![NJC+ disabled-release destination](../../docs/screenshots/dark/plus-release-gate.jpg)

| Route | Intended responsibility after release |
| --- | --- |
| `/plus` | NJC+ home |
| `/plus/[slug]` | Premium article, episode or feature |
| `/plus/watch` | Premium video library |
| `/plus/listen` | Premium audio library |
| `/plus/live` | Premium live programming |
| `/plus/search` | Premium catalog search |
| `/plus/join` | Membership selection and checkout handoff |
| `/plus/join/success` | Verified checkout return |
| `/plus/account` | Membership and billing controls |
| `/plus/courier-cut` | Invitation-aware Courier Cut screening-room tab |
| `/courier-cut` | Dedicated-host invite portal; viewing remains in NJC+ by default |

## Remaining web page patterns

| Route | Documentation state |
| --- | --- |
| `/distribution` | Uses the Distribution access capture above |
| `/distribution/package/[slug]` | Uses the same authorization boundary until a package grant is present |
| `/distribution/item/[id]` | Uses the same authorization boundary until an item grant is present |
| `/distribution/file/[id]` | Uses the same authorization boundary until a file grant is present |
| `/press-portal` | Uses the Press & Media capture above |
| `/link-in-bio` | Uses the Link in Bio capture above |
| `/link-in-bio/[slug]` | Audited redirect, not a rendered page |
| `/dev/platform` | Internal platform activation surface; represented by the developer authentication boundary |
| `/employee-link/v1/[...path]` | Validated application handoff, not a standalone content page |
