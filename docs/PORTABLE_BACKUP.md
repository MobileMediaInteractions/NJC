# Portable backups and provider migration

Harborline exports a provider-neutral encrypted archive containing every Postgres table in JSON and CSV, a SQL data script, Drizzle migrations, tracked Blob objects, non-secret configuration names, checksums and a restore guide.

## Create a local export

Use a private shell or secret manager for the passphrase rather than placing it in shared history:

```bash
BACKUP_PASSPHRASE='use-a-long-unique-secret' pnpm backup:export -- --output backups/harborline.hlnbackup
```

The Studio route supports convenient exports for a moderate media library. Use the CLI for large sites and raise `BACKUP_MAX_BYTES` only after confirming local disk capacity.

## Decrypt and unpack

```bash
BACKUP_PASSPHRASE='use-a-long-unique-secret' pnpm backup:restore -- --input backups/harborline.hlnbackup --output restored-harborline
```

Read `restored-harborline/RESTORE.md`. Apply migrations to the destination PostgreSQL database, then import `database/data.sql`. Upload `media/files` to the destination object store and rewrite media URLs if its public base URL changes.

## Security and rotation

- Keep the archive and its passphrase in separate systems.
- Raw API keys are never stored and cannot be exported. Restored API-key records are disabled.
- Secret environment values are excluded. Recreate and rotate database, Clerk, Blob, Upstash, cron and signing credentials.
- Verify row counts, media checksums, authentication, publishing, API limits and a private preview before switching DNS.
- Delete expired private Blob exports under the organization’s approved retention schedule.
