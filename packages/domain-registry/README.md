# `@njcourier/domain-registry`

This package is the typed catalog for the Courier apex domain, active product
hosts, security-gated hosts and intentionally reserved future hosts. Studio,
status monitoring and deployment tooling consume the same list so hostname
policy does not drift between applications.

![Managed-host status dashboard](../../docs/screenshots/dark/status-dashboard.jpg)

The registry describes approved intent; it does not itself edit DNS, attach a
Vercel domain or bypass the confirmation and operator controls in Studio.
The Courier Cut is registered as `cut.thejerseycourier.com`; its host activation
and its title-serving mode are separate controls, and the latter can never
remove invited content from NJC+.
