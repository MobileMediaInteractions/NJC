# `@harborline/api-client`

The shared client normalizes the configured API origin, applies JSON request
headers, unwraps the common `ApiEnvelope<T>` contract and converts non-success
responses into safe client errors. Mobile, TV and employee clients use it to
avoid reimplementing transport behavior.

![Mobile consumer of the shared API client](../../docs/screenshots/dark/mobile-reader.jpg)

```bash
pnpm --dir packages/api-client typecheck
```
