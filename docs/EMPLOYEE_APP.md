# Employee App

`apps/employee` is the dedicated iOS and Android home for privileged operations. It is separate from the reader app so reader releases do not carry employee navigation or operational UI.

## Identity and builds

- Working display name: `Employee App` (neutral until an approved internal name exists).
- Package: `@njcourier/employee`.
- iOS bundle ID: `com.mobilemediainteractions.thenews.employee`.
- Android application ID: `com.mobilemediainteractions.thenews.employee`.
- Custom scheme: `njcourier-employee`.
- EAS project ID, signing credentials, approved icon/launch art, and distribution links are intentionally unset.
- Clerk is shared as the identity provider, but each app maintains its own platform-secure token cache. Tokens are not copied between apps.

Run locally:

```bash
EXPO_PUBLIC_EMPLOYEE_API_URL=http://localhost:3000 \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-key> \
pnpm employee:start
```

Verify JavaScript/native bundles:

```bash
pnpm employee:check
pnpm employee:export
```

## Capability model

Role defaults are defined in `apps/web/src/lib/employee-permissions.ts`. Active per-user grants may allow or deny an individual capability and may expire or be revoked. A denial of `employee:access` removes every privileged capability. The server checks active account state and capabilities on every request; the app's filtered navigation is convenience, not security.

Implemented capabilities:

- `employee:access`
- `chat:read`, `chat:write`, `chat:manage`, `chat:moderate`
- `tools:metrics`, `tools:editorial`, `tools:alerts`, `tools:live`
- `access:review`
- `platform:license-admin` (admin default only; list/suspend/restore/revoke license records)

## Chat transport and data

Channels support public, private, direct, and group kinds. The API provides channel membership, cursor-paginated history and search, unread/read state, replies, mentions, edit, soft delete, pinning, reports, presence/typing heartbeats, private attachments, and generic push notifications. The first app UI exposes channels, direct messages, history/search, replies, deletion, unread counts, and reconnecting three-second polling. Group creation, pin management, report review, attachment selection, and full presence presentation have API foundations but remain UI follow-ups.

The launch transport is authenticated cursor polling over Vercel Functions and Neon Postgres. It avoids committing the project to a second realtime provider. A future WebSocket/pub-sub adapter must preserve the same membership and capability authorization.

Private attachment uploads accept JPEG, PNG, WebP, or PDF up to 4 MB and store them in private Vercel Blob paths. Downloads always re-check channel membership and use private no-store responses.

## Deep links

Version 1 links use one of these equivalent bases:

```text
njcourier-employee:///v1/<destination>
https://<configured-host>/employee-link/v1/<destination>
```

Supported destinations are dashboard, notifications, access request, the newsroom tools, license administration, and a UUID-addressed chat channel. Parsers use an allow list. The employee API resolves links again for authentication, minimum app version, capability, membership, and resource existence before returning an internal route.

The reader app checks `/employee/eligibility`. Eligible users are handed to the installed app; otherwise it shows only configured store, beta, enterprise, or managed-distribution links. Ineligible users request access before being prompted to install. The intended destination remains stored on the reader device for a retry.

Set `EXPO_PUBLIC_EMPLOYEE_LINK_HOST` at native build time to enable Universal Links/App Links for a Vercel-generated or future custom host. Configure the matching `EMPLOYEE_IOS_APP_ID` and Android signing fingerprints on the web deployment so `/.well-known` associations become valid.

## Release work outside the repository

1. Create a separate EAS project and replace the placeholder project ID.
2. Confirm ownership of both working application identifiers.
3. Create approved employee-app icons and launch assets.
4. Create Apple/Google signing credentials and employee push credentials.
5. Decide public store, unlisted, beta, enterprise, or managed distribution; set only real approved URLs.
6. Deploy the web app, choose its current `*.vercel.app` host (or later custom domain), set association variables, and rebuild native apps with that host.
7. Run the database migration and verify Clerk role/user synchronization in production.

## Operational limitations

- Cursor polling is near real time, not an always-connected socket transport.
- Private Blob, EAS, Clerk, and Postgres features require their external credentials.
- Native signing, entitlements, store records, domain validation, and physical-device push delivery cannot be completed from source alone.
- The neutral application name and identifiers are working values, not permanent brand approval.
