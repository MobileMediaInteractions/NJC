# NJ Courier internal application

This Next.js application is the origin behind the planned
`int.thejerseycourier.com` connection boundary. Access requires the network
edge, a valid identity, an active account and an explicit unexpired
`internal:access` capability. It is not a second Studio and it intentionally
does not inherit access from broad staff or administrator roles.

No production screenshot is published: an unauthorized visitor is supposed to
receive an indistinguishable connection failure with no branded error page.
Publishing a simulated internal dashboard would misrepresent that security
contract; the safe adjacent newsroom boundary is shown below.

![Public Studio access boundary](../../docs/screenshots/dark/studio-access.jpg)

See [the internal-boundary runbook](../../docs/security/INTERNAL_BOUNDARY.md)
and generated route register for the complete enforcement and audit model.

## Verification

```bash
pnpm --dir apps/internal test
pnpm --dir apps/internal typecheck
pnpm --dir apps/internal lint
pnpm --dir apps/internal build
pnpm internal:audit
```
