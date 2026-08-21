# The New Jersey Courier mobile app

One Expo SDK 57, React Native and TypeScript codebase for the New Jersey Courier iOS and Android apps. It uses Expo Router, the shared `@harborline/contracts` package, Clerk session tokens, Expo Notifications, Expo Video and SQLite-backed offline storage.

![Mobile reader home surface](../../docs/screenshots/dark/mobile-reader.jpg)

This browser-rendered capture documents the shared responsive shell. Store
screenshots must still be recaptured from signed release builds on physical or
simulated iOS and Android devices before submission.

## Configure

Copy the mobile values from the root `.env.example` into the local environment:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

For preview and store builds, set `EXPO_PUBLIC_API_URL` to the web project’s generated production origin, such as `https://your-project.vercel.app`. No custom domain is required. Update the value for a later app release only after the custom domain is attached and canonical.

The committed production API fallback is `https://www.thejerseycourier.com`.
`EXPO_PUBLIC_API_URL` can override it for local or preview work. Link the app to
an Expo account with `eas init`, which adds the real EAS project ID, then
configure APNs and FCM credentials through EAS. Remote notifications on Android
require a development build; Expo Go is not sufficient.

## Run and check

From the repository root:

```bash
pnpm mobile:start
pnpm --dir apps/mobile ios
pnpm --dir apps/mobile android
pnpm mobile:check
pnpm --dir apps/mobile bundle:ios
pnpm --dir apps/mobile export:web
```

## iOS archive and IPA

The source configuration includes the `njcourier` URL scheme, the production
API, iOS build number, and the `www.thejerseycourier.com` Associated Domain.
After Apple signing and EAS are connected, create a device-test IPA with:

```bash
cd apps/mobile
eas init
eas build --platform ios --profile preview
```

The preview profile uses internal distribution and therefore requires an Apple
Developer team and registered test devices. A store archive uses
`--profile production`. For a local IPA, install full Xcode and CocoaPods, run
`pnpm prebuild:ios`, and use `eas build --platform ios --profile preview --local`.
Apple credentials, profiles, devices, and EAS project IDs are external release
state and must never be committed.

Universal Links and Android App Links are intentionally incomplete until the
signed release identities exist. Configure `READER_IOS_APP_ID`,
`READER_ANDROID_PACKAGE` and
`READER_ANDROID_SHA256_CERT_FINGERPRINTS` on the web deployment, then verify
the canonical `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json` responses with the exact signed build. The
shared files also retain the separate employee-app identity.

The app does not ship fictional news or weather. Previously loaded API responses and user bookmarks remain available offline; first-run news, weather, and live screens show a retryable service state until the deployed API is reachable. Accounts, push registration and newsroom quick controls activate when Clerk, EAS and the deployed API are configured.

The app reports a random installation identifier, platform, version and last-active time for CMS platform totals. Readers can disable this under Account → Privacy and support; disabling removes the corresponding server record when the API is reachable.

The in-app scanner accepts only New Jersey Courier pairing links containing a session, matching code, target and single-use claim nonce. A successful scan claims the server request before approval controls appear, preventing a second account from racing the verifier. Cancel denies the claimed request; approval requires the same signed-in account that claimed it. Codes rotate every 60 seconds before scanning and remain frozen on the originating display during the bounded verification window.

Bundle identifiers default to `com.mobilemediainteractions.thenews` for both platforms. Confirm signing ownership and store records before the first production build.
