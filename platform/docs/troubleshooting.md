# Troubleshooting

- `service_not_configured`: set database, rate limiter and licensing signing/pepper variables from `apps/web/.env.example`.
- `wrong_application`: every identity field must match the registered row exactly, including environment/build/host/package/signing values.
- `invalid_installation_receipt`: refresh with the most recent signed receipt for that installation; revoked/version-changed receipts cannot mutate state.
- Package checksum/magic/length: rebuild from source; never bypass the verifier.
- Missing required feature/runtime: upgrade the host or compile against its declared capability set.
- Mobile/native build: the current production runtime is verified on TypeScript/web and headless Node; consult known limitations before enabling native distribution.
