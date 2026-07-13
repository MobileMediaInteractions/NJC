# Harborline Mobile API v1

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

## Native app notes

- Add bearer-token verification for signed-in reader features; Clerk can mint mobile-compatible session tokens.
- Keep `/api/v1` stable after native release. Add `/api/v2` for breaking response changes.
- Configure APNs and FCM behind a notification service that consumes the `alerts` table.
- Replace the demo weather response with a licensed forecast/radar provider while preserving the current contract.
- Use HLS for the value in `live.streamUrl`; native players can consume the same stream.
- Add cursor pagination before the story archive exceeds the first launch market.
- Use universal links / app links for `/story/:slug`, `/category/:slug`, `/weather` and `/live`.

## Studio endpoints

The CMS uses `/api/v1/studio/*`. These endpoints require an authenticated staff user and server-side role checks. They are not public mobile endpoints.
