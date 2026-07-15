# The New Jersey Courier TV

Shared Apple TV and Android TV/Google TV client built with Expo SDK 57 and `react-native-tvos`. It uses one TypeScript interface and a first-party, one-time device pairing flow rather than putting reader credentials on the television.

## Run for tvOS

1. Set `EXPO_PUBLIC_TV_API_URL` to the reachable New Jersey Courier web origin, initially `https://your-project.vercel.app`.
2. Install Xcode 16+ and a tvOS 17+ SDK/simulator.
3. Run `pnpm --dir apps/tv prebuild:tvos` once, then `pnpm --dir apps/tv tvos`.

The `EXPO_TV=1` scripts activate `@react-native-tvos/config-tv`. Native `ios/` output is generated and intentionally not committed.

## Run for Android TV / Google TV

1. Set `EXPO_PUBLIC_TV_API_URL` to the reachable public New Jersey Courier origin, initially `https://your-project.vercel.app`.
2. Install Android Studio and an Android TV ARM64 or x86_64 system image for API 31 or newer.
3. Start an Android TV emulator, then run:

```bash
pnpm --dir apps/tv prebuild:android-tv
pnpm --dir apps/tv android-tv
```

The prebuild configures the Leanback launcher, declares that touch input is not required, limits distribution to television devices and installs the New Jersey Courier TV banner. Generated `android/` output is intentionally not committed.

For EAS, replace `extra.eas.projectId` and run the `android-tv-development`, `android-tv-preview` or `android-tv-production` profile. The production profile outputs an Android App Bundle for Google Play.

Apple TV reports the `tvos` platform and uses pairing target `tv`; Android TV reports `androidtv` and uses the matching `androidtv` pairing target. Both resolve to revocable television device sessions.
