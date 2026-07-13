# Harborline mobile

One Expo SDK 57, React Native and TypeScript codebase for the Harborline iOS and Android apps. It uses Expo Router, the shared `@harborline/contracts` package, Clerk session tokens, Expo Notifications, Expo Video and SQLite-backed offline storage.

## Configure

Copy the mobile values from the root `.env.example` into the local environment:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Replace the placeholder EAS `projectId` in `app.json`, then configure APNs and FCM credentials through EAS. Remote notifications on Android require a development build; Expo Go is not sufficient.

## Run and check

From the repository root:

```bash
pnpm mobile:start
pnpm --dir apps/mobile ios
pnpm --dir apps/mobile android
pnpm mobile:check
pnpm --dir apps/mobile export:web
```

The app remains useful without connected services: published demo coverage, weather, bookmarks and cached content work offline. Accounts, push registration and newsroom quick controls activate when Clerk, EAS and the deployed API are configured.

The app reports a random installation identifier, platform, version and last-active time for CMS platform totals. Readers can disable this under Account → Privacy and support; disabling removes the corresponding server record when the API is reachable.

Bundle identifiers default to `com.mobilemediainteractions.thenews` for both platforms. Confirm signing ownership and store records before the first production build.
