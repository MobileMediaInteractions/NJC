# Privacy notes

Licensing stores customer/account identifiers only where required, pseudonymous device HMACs rather than raw device values, IP hashes where needed for abuse investigation, bounded usage counters, and audits. License keys and push/device tokens are redacted or disabled in portable backups. Receipts and message/package inputs must not enter analytics or logs.

Retention, deletion/export handling, regional processing and telemetry opt-in require product/legal decisions before launch. The runtime itself needs no network or identity capability; hosts explicitly provide those brokers.
