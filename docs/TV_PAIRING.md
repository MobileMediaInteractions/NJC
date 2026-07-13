# Apple TV and quick sign-in

Harborline has a dedicated Expo SDK 57 application in `apps/tv`. It aliases React Native to `react-native-tvos@0.86.0-2`, matching the React Native 0.86 line used by Expo SDK 57. The mobile project uses the same fork to avoid conflicting React Native copies in the monorepo, while only the TV project activates `@react-native-tvos/config-tv`.

## Apple TV build

Requirements are macOS, Xcode 16 or newer, and a tvOS 17 or newer SDK/simulator.

```bash
EXPO_PUBLIC_TV_API_URL=https://your-domain.example pnpm --dir apps/tv prebuild:tvos
EXPO_PUBLIC_TV_API_URL=https://your-domain.example pnpm --dir apps/tv tvos
```

`EXPO_TV=1` is already set by the TV scripts and EAS profiles. The generated native directory is a CNG build artifact and is not committed.

## Pairing states

1. The TV or unsigned browser creates a ten-minute request. The server stores only HMAC hashes of its private secret, six-character user code and requester IP.
2. The TV QR opens `/login/tv?session=…&code=…`. Manual activation at `/login/tv` accepts the code without a QR. A browser QR opens `harborline://pair` in the native app.
3. A user with a verified Clerk account sees the same code and must explicitly approve it. Five incorrect code attempts lock the request.
4. The initiating device polls using a 256-bit secret that is not present in the QR. The approved request can be claimed once.
5. Web receives a 90-second Clerk sign-in ticket. TV receives a random, HMAC-hashed, revocable 90-day device token.

Never log raw pairing secrets, sign-in tickets or device tokens. Keep `DEVICE_PAIRING_PEPPER` separate from other signing values and rotate it only with a plan to sign every TV out.

## Production checklist

- Apply migration `0004_rainy_wither.sql`.
- Configure `DATABASE_URL`, both Clerk keys and a 32-byte-or-longer `DEVICE_PAIRING_PEPPER` in every Vercel environment.
- Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin and `EXPO_PUBLIC_TV_API_URL` to that same origin for EAS builds.
- Replace both EAS project placeholders and Apple bundle identifiers before store submission.
- Test QR and manual-code activation, mismatch rejection, expiry, replay rejection, sign-out and a revoked/expired session.
- Complete Apple TV privacy disclosures and final entity-specific legal review before launch.
