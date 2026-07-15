# Press-kit generation

The public `/press` page lets a journalist, producer, researcher or event organizer describe an assignment and download a request-specific ZIP. It does not expose or search the private newsroom media library; the server packages only a fixed allowlist from `apps/cdn/public/assets` plus generated publication text.

## Request and archive flow

1. The requester supplies a name, media organization, work email, intended use and a 10–2,000 character description.
2. They select logos, publication background and/or the approved editorial illustration and accept the included usage license.
3. `POST /api/v1/press-kit` validates the JSON body, applies a three-per-hour requester limit and assembles the ZIP in the Node.js runtime.
4. The response is private and non-cacheable. Its `X-Press-Kit-Request-Id` header matches the ID in the archive manifest.
5. When Postgres is connected, the request and archive metadata appear under Studio → Press requests and are included in portable exports.

The ZIP contains a request summary, usage license, checksummed JSON manifest and the selected asset groups. Publication copy is marked provisional while the launch identity, entity and contact details remain unfinished.

## Vercel configuration

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in every production environment. Upstash provides the durable multi-instance rate limit; local development has a process-local fallback so the form remains testable without external services.

Set `PRESS_CONTACT_EMAIL` only when the publisher has established a monitored media address. If it is blank, generated archives state that the public contact is pending.

The archive has a 4,250,000-byte application cap to remain below Vercel’s 4.5 MB function request/response payload limit. New public assets must not be added to the ZIP allowlist without testing the largest possible package.

## Operations and privacy

- Apply the latest Drizzle migration before expecting Studio audit rows.
- Media contact details are for request fulfillment and appropriate follow-up, not automatic marketing enrollment.
- Administrators, editors and producers can view the Studio request log. Other Studio roles receive a restricted message.
- Every database row is included in the encrypted portable backup under `press_kit_requests`.
- The downloaded files are not a merchandise, endorsement, political or standalone-redistribution license.

## Verification

Run `pnpm --filter @njcourier/web test`, then generate all three groups and confirm the response remains below the application cap. On a production-like local build, `curl` can report the exact transfer size.
