# License API v1

All payloads are JSON. Production activation/lease/validation endpoints fail closed when durable Upstash rate limiting is absent.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/platform/keys` | Public current/retired Ed25519 verification keys |
| POST | `/api/v1/platform/activate` | License key + exact app identity + pseudonymous device + idempotency key |
| POST | `/api/v1/platform/validate` | Validate receipt against expected app and product |
| POST | `/api/v1/platform/features` | Return features/limits only after validation |
| POST | `/api/v1/platform/leases/online` | Refresh using installation ID and current receipt |
| POST | `/api/v1/platform/leases/offline` | Issue recorded offline receipt using current receipt |
| POST | `/api/v1/platform/installations/{id}/deactivate` | Deactivate using current receipt |
| POST | `/api/v1/platform/admin/catalog` | Admin-only catalog/application identity/plan setup |
| GET/POST | `/api/v1/platform/admin/licenses` | Admin-only list or one-time secret creation |
| POST | `/api/v1/platform/admin/licenses/{id}/status` | Admin-only audited status/version change |

First-party receipt issuance is intentionally not public in this milestone because device/app attestation is not configured. Do not replace it with a client-supplied “firstParty” flag.
