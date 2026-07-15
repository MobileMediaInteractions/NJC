# Brand asset catalog

Canonical files live under `apps/cdn/public/assets`. The `v1` segment is part of the public contract and must not be overwritten after production launch.

| Asset | Public pathname | Use |
| --- | --- | --- |
| NJC seal | `/assets/brand/v1/mark.svg` | Compact navigation, avatars, small surfaces |
| Full wordmark | `/assets/brand/v1/wordmark.svg` | Light backgrounds and press materials |
| Inverse wordmark | `/assets/brand/v1/wordmark-inverse.svg` | Forest/dark backgrounds |
| App icon source | `/assets/brand/v1/app-icon.svg` | Platform icon generation source |
| Adaptive icon foreground | `/assets/brand/v1/adaptive-foreground.svg` | Android/Google TV foreground source |
| Garden State engraving | `/assets/editorial/v1/garden-state-engraving.png` | Brand cards, launch materials, conceptual editorial use |
| Machine manifest | `/assets/manifest.json` | Client-side asset discovery and export inventory |

The Garden State engraving was produced with the built-in image-generation workflow from an original prompt. It contains no publication text and is intentionally classified as brand illustration, not news photography.

When an asset changes, publish `v2` and update consuming clients deliberately. Content-addressed Vercel Blob names should follow the same immutable approach.
