# Website notifications

The New Jersey Courier website uses standards-based VAPID Web Push. It does not
add Firebase as a second browser notification stack. Existing iOS, Android and
employee applications continue to use their established Expo notification
integration.

## Reader experience

- Enrollment is available on `/newsletter` only when Alerts is enabled in
  Studio and the server has a complete VAPID configuration.
- The browser permission prompt appears only after the reader presses **Enable
  site notifications**.
- Readers can unsubscribe from the same page or through browser settings.
- Existing subscriptions are reconciled when an account signs in, signs out or
  changes. A signed-out shared browser is not left associated with the previous
  account.
- Notification click destinations are reduced to a validated local path. The
  service worker rejects external origins and falls back to the front page.

## Studio campaigns

Authorized alert operators use Studio → Communications → Site notifications.
The composer provides guided choices instead of requiring raw account IDs:

- every active website subscription;
- one or more selected accounts;
- one or more current newsroom roles;
- exactly one NJC+ entitlement group: **NJC+ Member**, **NJC+ Trial**,
  **Complimentary NJC+**, or **Invited Beta Tester**.

Entitlement groups are resolved from current database status and dates at send
time. Invited beta access is never treated as paid membership. Only sitewide
campaigns include anonymous subscriptions. Account, role and entitlement sends
include linked active subscriptions only.

Campaign history distinguishes recipients, device subscriptions, provider
acceptance and failures. Provider acceptance does not prove that a person saw a
notification. Studio audit records exclude push endpoints and encryption keys.

## Required environment

```text
NEXT_PUBLIC_WEB_PUSH_VAPID_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_CONTACT=
```

Generate one VAPID key pair and store the private key only in Vercel secret
configuration. `WEB_PUSH_CONTACT` must be a monitored `mailto:` or `https:`
contact. A new key pair invalidates existing subscriptions, so rotate it only
with a reader re-enrollment plan.

## Data and operations

Postgres stores browser endpoints and the public encryption material needed by
the Web Push protocol. Portable exports retain campaign history but remove and
revoke every browser endpoint and key; restored subscriptions must be enrolled
again. HTTP 404 or 410 responses revoke stale endpoints. Sensitive or internal
information must never be placed in a lock-screen message.
