# New Jersey Courier CDN

This is the canonical source tree for versioned Courier assets. A separate deployment is optional: initially, the web prebuild mirrors these files and serves them from `/assets` on the web project’s generated `*.vercel.app` URL.

Paths are immutable once published. Add a new version directory instead of replacing a production asset:

```text
/assets/brand/v1/...
/assets/editorial/v1/...
/assets/manifest.json
```

If independent asset deployment is useful later, deploy this folder as a second Vercel project and use its generated `*.vercel.app` URL. After a domain is purchased, that same project can receive `cdn.<domain>`. Set `NEXT_PUBLIC_ASSET_ORIGIN` only when using the separate project.

CMS uploads belong in the connected public Vercel Blob store under similarly versioned or content-addressed paths. Do not place private documents in this project.
