# Third-party licensing

Create catalog records, register every approved application identity, then create a commercial/trial/development license. The raw license key is shown once. A third-party app without a key is rejected; a valid key for a different app is rejected; an entitled exact identity receives a short signed receipt.

For local proof, set `PLATFORM_DEV_LICENSE_MODE=true` outside production and run `pnpm platform:demo`. The fixture throws when `NODE_ENV=production` and is never used by the production licensing routes.
