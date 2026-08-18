# `@harborline/backend`

This package owns shared Drizzle database exports used by server-side
workspaces. It is infrastructure, not a public backend dashboard. Schema
changes must remain migration-backed, portable through the repository backup
format, and protected by the authorization layer in the consuming API route.

![Studio boundary in front of backend operations](../../docs/screenshots/dark/studio-access.jpg)

```bash
pnpm --dir packages/backend typecheck
```
