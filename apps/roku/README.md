# The New Jersey Courier for Roku

New Jersey Courier’s Roku client is a native SceneGraph application written in BrightScript. It reads the same Vercel-hosted `/api/v1` stories, weather, live HLS and device-pairing endpoints as the other clients while reporting Roku installations separately in Studio analytics.

## What works

- Remote-first latest-story rail and lead-story reading view
- Live HLS playback through Roku’s native `Video` node
- Weather conditions and alerts
- System, light and dark appearance preferences stored in the Roku registry
- Public access without an account
- Optional QR/manual sync-code linking with a revocable 90-day device token
- Anonymous Roku installation presence with no reading history or advertising identifier

Roku does not currently expose a documented app-facing light/dark appearance preference. The `System` choice therefore uses New Jersey Courier’s television-optimized dark palette; explicit Light and Dark choices remain available and persistent.

## Validate and build

The repository build compiles with an intentionally unconfigured manifest so CI can validate the SceneGraph source without producing a client that contacts a placeholder host:

```bash
pnpm roku:check
pnpm roku:build
```

Create the production ZIP with the real public Vercel origin. The command copies the source to a temporary staging directory and substitutes the URL without changing the committed manifest.

```bash
ROKU_API_URL=https://your-actual-deployment.vercel.app pnpm roku:package
```

The result is `apps/roku/dist/njcourier-roku.zip`. Its root contains `manifest`, `source/` and `components/`, as required by the Roku Developer Application Installer. Production packaging rejects placeholder hosts and URLs containing credentials, paths, queries or fragments.

For LAN testing only, an HTTP origin can be packaged with `ROKU_ALLOW_HTTP=1`. Production should always use HTTPS.

## Sideload on a Roku

Enable developer mode on the Roku, record its LAN IP and developer password, then run:

```bash
ROKU_API_URL=https://your-actual-deployment.vercel.app pnpm roku:package
ROKU_DEV_TARGET=192.168.1.50 DEVPASSWORD='your-device-password' pnpm roku:install
```

The second command uploads the existing ZIP to the device’s Developer Application Installer. A physical Roku is required for final remote-focus, video codec, memory and device-family testing.

## Store submission note

Current Roku certification guidance requires non-TVE apps that require authentication to support an on-device authentication path. New Jersey Courier’s news, weather and live coverage do not require an account; QR/code linking is an optional personalization convenience. Before a Roku Channel Store submission, confirm the current authentication rules with Roku and add an approved on-device OAuth/AAL flow if Roku treats optional linking as an authenticated experience. Do not make remote-only linking a gate to public news.

The launch package also needs final Roku artwork, screenshots, privacy disclosures, content ratings, streaming rights and device-matrix certification after the real identity and region are selected.
