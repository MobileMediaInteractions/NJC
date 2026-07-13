# Harborline Local TV

Dedicated Apple TV client built with Expo SDK 57 and `react-native-tvos`. It uses a first-party, one-time device pairing flow rather than putting reader credentials on the television.

## Run for tvOS

1. Set `EXPO_PUBLIC_TV_API_URL` to the reachable Harborline web origin.
2. Install Xcode 16+ and a tvOS 17+ SDK/simulator.
3. Run `pnpm --dir apps/tv prebuild:tvos` once, then `pnpm --dir apps/tv tvos`.

The `EXPO_TV=1` scripts activate `@react-native-tvos/config-tv`. Native `ios/` output is generated and intentionally not committed.
