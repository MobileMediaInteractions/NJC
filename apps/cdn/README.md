# New Jersey Courier CDN

This is the canonical source tree for versioned Courier assets. Production uses
the dedicated `https://cdn.thejerseycourier.com` origin. The web prebuild still
mirrors the same files into `/assets`, preserving a same-origin fallback for
local development and provider portability.

![Courier application icon](public/assets/brand/v1/app-icon-512.png)

Paths are immutable once published. Add a new version directory instead of replacing a production asset:

```text
/assets/brand/v1/...
/assets/editorial/v1/...
/assets/manifest.json
```

Deploy this folder as a second Vercel project with Root Directory `apps/cdn`,
Framework Preset `Other`, and the `cdn.thejerseycourier.com` hostname. Set the
web project’s `NEXT_PUBLIC_ASSET_ORIGIN` to that exact HTTPS origin only after
the manifest and a versioned asset have been verified.

CMS uploads belong in the connected public Vercel Blob store under similarly versioned or content-addressed paths. Do not place private documents in this project.
