# Development license fixtures

Fixtures are created in memory only. `createDevelopmentLicenseFixture` throws when `NODE_ENV=production` and requires `PLATFORM_DEV_LICENSE_MODE=true`. No development private key, license key, or bypass is compiled into a client application.
