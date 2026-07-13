# Harborline Mobile and Developer API v1

The public web application and future native clients use the same versioned JSON surface under `/api/v1`. Page components do not define mobile contracts.

## Public endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/config` | Brand, navigation, region and feature flags |
| `GET` | `/api/v1/stories?category=&q=&limit=` | Published story feed and search |
| `GET` | `/api/v1/stories/:slug` | Full story payload |
| `GET` | `/api/v1/weather` | Current conditions, alert and hourly data |
| `GET` | `/api/v1/live` | Live channel state, stream URL and schedule |
| `POST` | `/api/v1/newsletter` | Newsletter subscription |
| `POST` | `/api/v1/comments` | Moderated comment submission |
| `POST` | `/api/v1/tips` | Newsroom tip intake |
| `POST` | `/api/v1/mobile/push/register` | Register an Expo push token |
| `POST` | `/api/v1/audience/presence` | Record consent-aware Web/iOS/Android/tvOS/Roku installation presence |
| `DELETE` | `/api/v1/audience/presence` | Remove an anonymous installation record after opt-out |

Every successful response follows:

```json
{
  "data": {},
  "meta": { "apiVersion": "1" }
}
```

Errors follow:

```json
{
  "error": {
    "code": "machine_readable_code",
    "message": "Human-readable explanation"
  }
}
```

## Native app implementation

- The Expo client sends Clerk session tokens as bearer authorization for signed-in newsroom features.
- SQLite key-value storage retains feeds, weather and bookmarks for offline reading.
- Keep `/api/v1` stable after native release. Add `/api/v2` for breaking response changes.
- Expo Push Service fans alerts out to registered APNs/FCM-backed devices in batches of 100. Configure EAS credentials and optional enhanced push security.
- Replace the demo weather response with a licensed forecast/radar provider while preserving the current contract.
- Use HLS for the value in `live.streamUrl`; native players can consume the same stream.
- Add cursor pagination before the story archive exceeds the first launch market.
- Use universal links / app links for `/story/:slug`, `/category/:slug`, `/weather` and `/live`.
- Platform presence records contain a random installation ID, platform, app version and activity timestamps. They do not contain reading history or an advertising identifier.

## Device pairing, Apple TV and Roku

Apple TV and Roku do not collect a Clerk password. They create a ten-minute pairing request and display both a QR and a six-character sync code. A signed-in website or mobile app must show and explicitly confirm the identical code before the request can be exchanged once. Public television content does not require sign-in.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/device-pairing` | Create a rate-limited TV or web pairing request |
| `POST` | `/api/v1/device-pairing/:id/approve` | Approve matching code with a Clerk session |
| `POST` | `/api/v1/device-pairing/approve` | Approve a TV by manually entered sync code |
| `POST` | `/api/v1/device-pairing/:id/poll` | Exchange the private device secret once after approval |
| `GET` | `/api/v1/device-pairing/qr?value=` | Render a no-store PNG QR image |
| `GET` | `/api/v1/device-session` | Resolve a revocable television device token |
| `DELETE` | `/api/v1/device-session` | Sign the television out and revoke its token |

Browser pairing returns a 90-second, one-time Clerk sign-in ticket. Apple TV and Roku pairing return first-party tokens that are HMAC-hashed at rest, expire after 90 days and are only accepted by device-session endpoints. Pairing codes and raw device tokens are never stored. Configure `DEVICE_PAIRING_PEPPER` independently from `API_KEY_PEPPER`.

## Limited mobile newsroom endpoints

These routes require a valid Clerk bearer token and an `admin`, `editor` or `producer` role. Full story editing stays in the web Studio.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/mobile/admin/queue` | Review, scheduled and recent published stories |
| `PATCH` | `/api/v1/mobile/admin/stories/:id` | Publish, return, review, schedule or archive |
| `POST` | `/api/v1/mobile/admin/alerts` | Record and send breaking/weather alerts |
| `PATCH` | `/api/v1/mobile/admin/live` | Toggle the cross-platform live banner |
| `GET` | `/api/v1/mobile/admin/metrics` | Queue counts, alert/device counts and DB health |

The mobile metrics response includes the same Web, iOS, Android, Apple TV, Roku and developer-API audience summary shown in Studio.

## Self-service developer API

Verified accounts create and revoke keys at `/developers`. Send the one-time secret in `X-API-Key` or as a bearer token.

| Scope | Endpoints |
| --- | --- |
| `news:read` | `/api/developer/v1/stories`, `/api/developer/v1/config` |
| `weather:read` | `/api/developer/v1/weather` |
| `live:read` | `/api/developer/v1/live` |

Each key is HMAC-hashed at rest, audited, revocable, limited to five active keys per account, and defaults to 60 requests per minute plus 10,000 requests per day. Upstash Redis is mandatory for these developer routes; they fail closed if the limiter is unavailable.

Rate responses include `X-RateLimit-Limit-Minute`, `X-RateLimit-Remaining-Minute`, `X-RateLimit-Limit-Day` and `X-RateLimit-Remaining-Day`. A `429` also includes `Retry-After`.

## Studio endpoints

The CMS uses `/api/v1/studio/*`. These endpoints require an authenticated staff user and server-side role checks. They are not public mobile endpoints.

`GET /api/v1/studio/audience` returns 24-hour, 7-day, 30-day and all-time platform totals. Web totals include only visitors who allow optional analytics. iOS and Android users can remove their installation record by disabling anonymous audience measurement in the app. Apple TV and Roku are reported separately as `tvos` and `roku`.
