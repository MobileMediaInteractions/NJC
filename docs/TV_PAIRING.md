# Television and quick sign-in

New Jersey Courier has a shared Expo SDK 57 television application in `apps/tv`. It aliases React Native to `react-native-tvos@0.86.0-2`, matching the React Native 0.86 line used by Expo SDK 57 and supporting both Apple TV and Android TV/Google TV. The mobile project uses the same fork to avoid conflicting React Native copies in the monorepo, while only the TV project activates `@react-native-tvos/config-tv`.

The native Roku client in `apps/roku` uses the same pairing protocol with the distinct `roku` target and receives a device session labeled `roku`. Both television clients remain fully usable for public news without an account.

![The manual television pairing entry](screenshots/product/tv-pairing.jpg)

## Apple TV build

Requirements are macOS, Xcode 16 or newer, and a tvOS 17 or newer SDK/simulator.

```bash
EXPO_PUBLIC_TV_API_URL=https://your-project.vercel.app pnpm --dir apps/tv prebuild:tvos
EXPO_PUBLIC_TV_API_URL=https://your-project.vercel.app pnpm --dir apps/tv tvos
```

`EXPO_TV=1` is already set by the TV scripts and EAS profiles. The generated native directory is a CNG build artifact and is not committed.

## Android TV / Google TV build

Requirements are Android Studio, an Android TV system image for API 31 or newer, and an Android TV emulator or physical device.

```bash
EXPO_PUBLIC_TV_API_URL=https://your-project.vercel.app pnpm --dir apps/tv prebuild:android-tv
EXPO_PUBLIC_TV_API_URL=https://your-project.vercel.app pnpm --dir apps/tv android-tv
```

The Expo TV plugin adds the Leanback launcher category, television-only feature declarations and banner metadata during prebuild. The same TypeScript UI, theme controls and secure storage implementation are used on both television operating systems.

## Pairing states

1. The TV or unsigned browser creates a 60-second, single-use request. The server stores HMAC hashes of its private secret, six-character user code and QR claim nonce; raw credentials are returned only to the initiating client.
2. The TV QR opens `/login/tv?session=…&code=…&nonce=…&target=tv|androidtv|roku`. A browser QR opens `harborline://pair` in the native app. Manual activation at `/login/tv` remains available without placing the initiating device secret in either link.
3. A signed-in scanner atomically claims the pending request with its nonce. That moves the server record to `processing`, records the verifying account, rejects competing scans and starts a separate two-minute verification timeout.
4. The initiating display freezes its code and countdown, obscures the QR with a processing treatment and keeps polling with its 256-bit device secret. The verifier must compare the visible code and explicitly approve or deny the request.
5. Approval is accepted only from the account that claimed the scanned request. Five incorrect manual-code attempts lock a request. Denied, expired and conflicting requests cannot be reused.
6. On approval, the initiating device shows a full-screen success state for five seconds, refreshes account state and returns to its prior destination. Web receives a 90-second Clerk sign-in ticket; Apple TV, Android TV and Roku receive random, HMAC-hashed, revocable 90-day device tokens.

The database states are `pending`, `processing`, `approved`, `denied`, `expired` and `consumed`. Pending codes rotate on the initiating client at 60 seconds. A scanned request never rotates underneath the verifier: it remains frozen until approval, denial or the server-controlled processing timeout.

Never log raw pairing secrets, sign-in tickets or device tokens. Keep `DEVICE_PAIRING_PEPPER` separate from other signing values and rotate it only with a plan to sign every TV out.

## Production checklist

- Apply all migrations through `0033_busy_crusher_hogan.sql`; migration 0033 adds the hashed QR claim nonce, claimant identity and bounded processing window.
- Configure `DATABASE_URL`, both Clerk keys and a 32-byte-or-longer `DEVICE_PAIRING_PEPPER` in every Vercel environment.
- Leave `NEXT_PUBLIC_SITE_URL` unset while using Vercel’s generated hostname. Set `EXPO_PUBLIC_TV_API_URL` to the web project’s production `*.vercel.app` origin for EAS builds. When a custom domain is attached, set both values to its canonical HTTPS origin for the next release.
- Replace both EAS project placeholders and Apple bundle identifiers before store submission.
- Test QR and manual-code activation, mismatch denial, 60-second rotation, processing timeout, replay rejection, competing scans, sign-out and a revoked/expired session on every real target.
- Complete Apple TV privacy disclosures and final entity-specific legal review before launch.
- Add final 320×180 Android TV banner/icon artwork, complete Google Play TV quality testing and test D-pad focus on representative devices.
- Keep Roku public access account-free and review Roku’s current on-device authentication certification requirements before Channel Store submission.
