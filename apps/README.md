# Applications

`apps` contains every deployable or installable NJ Courier client. Shared
business rules belong in `packages`; application folders own platform entry
points, navigation, assets, environment wiring, and release configuration.

| Workspace | Product surface | Documentation |
| --- | --- | --- |
| `web` | Publication, Studio, NJC+, Press, Distribution, Links, auth and APIs | [Web application](web/README.md) |
| `mobile` | Reader app for iOS and Android | [Mobile reader](mobile/README.md) |
| `employee` | Separate privileged employee app for iOS and Android | [Employee app](employee/README.md) |
| `tv` | Apple TV and Android TV/Google TV client | [TV app](tv/README.md) |
| `roku` | Native SceneGraph/BrightScript Roku channel | [Roku app](roku/README.md) |
| `status` | Independently deployed public status service | [Status service](status/README.md) |
| `internal` | Connection-gated `int` application boundary | [Internal app](internal/README.md) |
| `cdn` | Immutable first-party public assets | [CDN](cdn/README.md) |
| `platform-playground` | Browser workbench for the animation runtime | [Platform playground](platform-playground/README.md) |

![Dark-mode Courier publication](../docs/screenshots/dark/web-home.jpg)

Protected screens are documented at their public access boundary. Repository
documentation must never include staff records, private packages, financials,
analytics, active pairing codes, access tokens, or unreleased editorial work.
