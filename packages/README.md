# Shared packages

These workspaces contain reusable contracts and infrastructure. They do not
render standalone pages; each README therefore links to a real consumer
surface rather than manufacturing a package UI.

| Package | Responsibility | Documentation |
| --- | --- | --- |
| `api-client` | Typed API envelope and request transport | [API client](api-client/README.md) |
| `backend` | Shared Drizzle database schema/connection exports | [Backend](backend/README.md) |
| `contracts` | Cross-platform models, themes and public configuration | [Contracts](contracts/README.md) |
| `domain-registry` | Canonical hostname catalog and provisioning policy | [Domain registry](domain-registry/README.md) |
| `media-player` | Installable React video/audio player and controlled editorial timeline | [Media player](media-player/README.md) |

![A shared-contract consumer in dark mode](../docs/screenshots/dark/web-home.jpg)
