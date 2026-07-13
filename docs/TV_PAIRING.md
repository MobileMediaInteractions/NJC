# Television and quick sign-in

Harborline has a shared Expo SDK 57 television application in `apps/tv`. It aliases React Native to `react-native-tvos@0.86.0-2`, matching the React Native 0.86 line used by Expo SDK 57 and supporting both Apple TV and Android TV/Google TV. The mobile project uses the same fork to avoid conflicting React Native copies in the monorepo, while only the TV project activates `@react-native-tvos/config-tv`.

The native Roku client in `apps/roku` uses the same pairing protocol with the distinct `roku` target and receives a device session labeled `roku`. Both television clients remain fully usable for public news without an account.

## Apple TV build

Requirements are macOS, Xcode 16 or newer, and a tvOS 17 or newer SDK/simulator.

```bash
EXPO_PUBLIC_TV_API_URL=https://your-domain.example pnpm --dir apps/tv prebuild:tvos
EXPO_PUBLIC_TV_API_URL=https://your-domain.example pnpm --dir apps/tv tvos
```

`EXPO_TV=1` is already set by the TV scripts and EAS profiles. The generated native directory is a CNG build artifact and is not committed.

## Android TV / Google TV build

Requirements are Android Studio, an Android TV system image for API 31 or newer, and an Android TV emulator or physical device.

```bash
EXPO_PUBLIC_TV_API_URL=https://your-domain.example pnpm --dir apps/tv prebuild:android-tv
EXPO_PUBLIC_TV_API_URL=https://your-domain.example pnpm --dir apps/tv android-tv
```

The Expo TV plugin adds the Leanback launcher category, television-only feature declarations and banner metadata during prebuild. The same TypeScript UI, theme controls and secure storage implementation are used on both television operating systems.

## Pairing states

1. The TV or unsigned browser creates a ten-minute request. The server stores only HMAC hashes of its private secret, six-character user code and requester IP.
2. The TV QR opens `/login/tv?session=…&code=…&target=tv|androidtv|roku`. Manual activation at `/login/tv` accepts the code without a QR. A browser QR opens `harborline://pair` in the native app.
3. A user with a verified Clerk account sees the same code and must explicitly approve it. Five incorrect code attempts lock the request.
4. The initiating device polls using a 256-bit secret that is not present in the QR. The approved request can be claimed once.
5. Web receives a 90-second Clerk sign-in ticket. Apple TV, Android TV and Roku receive random, HMAC-hashed, revocable 90-day device tokens.

Never log raw pairing secrets, sign-in tickets or device tokens. Keep `DEVICE_PAIRING_PEPPER` separate from other signing values and rotate it only with a plan to sign every TV out.

## Production checklist

- Apply migration `0004_rainy_wither.sql`.
- Configure `DATABASE_URL`, both Clerk keys and a 32-byte-or-longer `DEVICE_PAIRING_PEPPER` in every Vercel environment.
- Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin and `EXPO_PUBLIC_TV_API_URL` to that same origin for EAS builds.
- Replace both EAS project placeholders and Apple bundle identifiers before store submission.
- Test QR and manual-code activation, mismatch rejection, expiry, replay rejection, sign-out and a revoked/expired session.
- Complete Apple TV privacy disclosures and final entity-specific legal review before launch.
- Add final 320×180 Android TV banner/icon artwork, complete Google Play TV quality testing and test D-pad focus on representative devices.
- Keep Roku public access account-free and review Roku’s current on-device authentication certification requirements before Channel Store submission.
