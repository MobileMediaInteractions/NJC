# Website and Studio sessions

## Requested policy and current limitation

The desired browser login lifetime is **no more than 30 days from sign-in**.
This is an absolute maximum, not a sliding 30-day extension on every request.
Explicit sign-out, revocation, account restrictions and permission checks must
still take effect sooner. Sensitive Studio operations retain their independent
verification and audit controls.

Clerk is the existing authoritative identity/session provider. Its
[session options documentation](https://clerk.com/docs/guides/secure/session-options)
states that production uses a default seven-day maximum, and customizing the
maximum or inactivity timeout requires a paid plan. The repository cannot
extend a provider-expired session by changing a cookie expiration or a React prop.

The project remains subject to the owner's **free-only** requirement. No plan
upgrade was purchased, no billing settings changed, and no independent persistent
login token or authentication cookie added. The 30-day target is **not an active
Clerk setting** and is not represented by a pretend SDK duration option.
On a free production instance, accept the provider's shorter seven-day maximum;
if 30 days becomes mandatory, it requires a separately approved identity-provider
decision or a change to the no-paid-services requirement. Neither is silently
implemented here. Browsers that clear cookies, private browsing and revocations
can end a session earlier.

## Live configuration evidence — October 15, 2026

A read-only fetch of `https://www.thejerseycourier.com/sign-in` showed a
`pk_test_` publishable key and a `clerk.accounts.dev` Frontend API script.
No secret key, session cookie or account credential was extracted. This proves
the page used a development instance at the time of inspection; it does not
prove the configured session lifetime or diagnose every sign-in failure.

Clerk documents that
[development instances have a different session architecture](https://clerk.com/docs/guides/development/managing-environments)
and are not suitable for production. This is a likely contributor to unreliable
browser/subdomain persistence, not a verified account-specific root cause.

Production activation remains external work. Do **not** blindly replace keys:
development and production identities can have different Clerk user IDs. Existing
staff roles, profiles, authorship, entitlements, invitations, grants, account links
and audit references must be reconciled under an approved migration plan first.
Google and other social providers need their own approved production OAuth
credentials; do not rely on shared development OAuth credentials.

## Shared first-party sign-in

The main site and Studio use the same Clerk application and provider. In a
properly configured root-domain production instance, Clerk supports
[shared sessions across subdomains](https://clerk.com/docs/guides/development/deployment/production).
`www.thejerseycourier.com` and `studio.thejerseycourier.com` are subdomains of
the same registered domain; they do not need a paid, different-domain satellite
setup. The Vercel `*.vercel.app` origin is a different domain and must not be
promised the same cookie-based sign-in as the custom domain.

Use `thejerseycourier.com` as the production root domain and configure Clerk's
required DNS/TLS records. Confirm the same production publishable/secret key
pair is used by all relevant `njc-web` hosts. Use Clerk's
[allowed-subdomains controls](https://clerk.com/docs/guides/dashboard/dns-domains/subdomain-allowlist)
to permit only deployed surfaces that actually initialize Clerk (the canonical
site, Studio, API/developer portal, NJC+, Courier Cut, Distribution, Press, and
links as applicable). Do not enable an arbitrary wildcard or include reserved
internal/CDN/status infrastructure merely for convenience. Preserve existing
mobile and TV token flows and their separate authorization requirements.

Clerk owns cookie scope, token rotation, refresh, expiry and revocation. Do not
copy cookies across hosts, store Clerk tokens in `localStorage`, use a shared
password, or generate a custom “remember me” credential to bypass those controls.
Analytics consent is separate from essential authentication cookies; changing
analytics consent must not sign out an account.

## Application routing

- Main-site sign-in and sign-up use `/auth/continue` as their **fallback**,
  replacing the old unconditional developer-portal destination. Explicit Clerk
  return destinations remain honored; sign-up no longer forces `/developers`.
- `/auth/continue` is matched by Clerk middleware, checks the authenticated
  account server-side, then checks its authoritative staff role. Staff land in
  the configured Studio destination; other accounts land in `/profile`.
- An already signed-in visitor to the main sign-in root continues without
  entering credentials again. Studio's sign-in root similarly skips the form
  for an already authorized staff account. Clerk's nested OAuth/account-choice
  routes are left to Clerk rather than prematurely redirected.
- Optional continuation destinations accept same-origin paths or exact
  configured first-party product origins, reject credentialed/protocol-relative/
  malformed URLs and authentication loops, and never confer authorization.
  Resource access is still checked by the destination's existing role and
  permission rules.
- No database schema or existing API contract changes are needed for this
  navigation adjustment.

## Verification and release

Automated tests cover staff/reader destinations, configured Studio URLs,
preserved return routes, open-redirect/recursive-path rejection, provider
fallback configuration and the existing access-role checks.

Real session persistence is **not verified** by these tests or local rendering:
this checkout has no Clerk credentials. Before calling session sharing complete,
use two real authorized/unauthorized accounts and separate browser profiles:

1. Sign in on the canonical site; enter Studio without a second credential flow.
2. Reload, close/reopen the browser, and navigate both directions across hosts.
3. Confirm a reader remains signed in but cannot enter staff-only routes.
4. Revoke a session and remove/change a staff role; verify immediate appropriate
   denial and no stale privileged navigation/access.
5. Test sign-out propagation, OAuth return paths, explicit product destinations,
   account switching and essential-only analytics consent.
6. Inspect Clerk's actual production maximum/inactivity settings and confirm
   provider expiration is never later than the requested 30-day cap. Do not
   claim 30-day persistence while using a shorter provider lifetime.
7. Verify custom-domain/Google OAuth/DNS readiness and safe identity migration
   before replacing development keys in a production deployment.
