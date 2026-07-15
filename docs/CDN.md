# Courier asset delivery

## Phase 1: no purchased domain

Deploy only `apps/web`. Its prebuild script mirrors the canonical files from `apps/cdn/public/assets` into `apps/web/public/assets`, and Vercel serves them through the web project’s automatic HTTPS production alias:

```text
https://<project-name>.vercel.app/assets/brand/v1/wordmark.svg
```

Leave `NEXT_PUBLIC_ASSET_ORIGIN` unset. The applications use same-origin `/assets/...` paths, so local development, Vercel previews and the production `*.vercel.app` alias all work without DNS or cross-origin configuration.

## Phase 2: optional separate asset project

If asset traffic later needs independent ownership or deployment, create a second Vercel project with Root Directory `apps/cdn` and framework preset `Other`. It receives its own generated URL, for example `https://new-jersey-courier-assets.vercel.app`.

Set the web project’s `NEXT_PUBLIC_ASSET_ORIGIN` to that exact origin. The Next.js image allowlist is generated from the configured value at build time, so arbitrary Vercel hosts are not trusted.

## Phase 3: custom domains

After purchasing a domain:

1. Attach the primary domain to the existing web project.
2. Set `NEXT_PUBLIC_SITE_URL` to its canonical HTTPS origin.
3. Optionally attach `cdn.<domain>` to the asset project.
4. If the CDN project is used, update `NEXT_PUBLIC_ASSET_ORIGIN` to its custom HTTPS origin and redeploy.
5. Verify `/assets/manifest.json` before updating native release builds.

Every public pathname remains unchanged across these phases. Only the origin changes.

## Asset classes

1. **Repository brand assets** — Logos, icons and evergreen illustration live in `apps/cdn/public/assets`. They are public, reviewed, versioned and immutable.
2. **CMS public media** — Photographs, video, audio and documents intended for publication live in public Vercel Blob storage. Store the returned URL, checksum, credit, caption, MIME type, dimensions and export status in Postgres.
3. **Private newsroom files** — Embargoed, source-protected or administrative files must use private storage or another access-controlled provider. Never place them under a public asset path.

Files under a versioned asset directory receive `Cache-Control: public, max-age=31536000, immutable`. Add a new version rather than overwriting one. Portable exports include the asset source tree, Blob inventory and downloaded media objects so another account or provider can reproduce or rewrite the origins.
