# NJ Courier mobile PWA

The public website is an installable Progressive Web App. It deliberately
shares one service worker with Courier web push so there is only one worker for
the root scope.

![The Courier mobile PWA home experience](screenshots/product/homepage-mobile.jpg)

## Reader experience

- Android and compatible Chromium browsers expose **Install NJ Courier** in the
  mobile menu when the browser declares the site installable.
- iPhone and iPad readers receive device-appropriate **Add to Home Screen**
  instructions. Installed mode uses the safe areas around notches, the Dynamic
  Island and the Home indicator.
- The public mobile shell uses a persistent bottom dock for Home, Latest,
  Search, Weather or Tip line, and the current account destination.
- The app manifest includes dedicated 192 px, 512 px, maskable and Apple touch
  icons plus shortcuts to Latest, Weather and the tip line.
- A connection status appears when the browser goes offline. Previously opened
  public pages can be read from the bounded runtime cache; an original branded
  offline screen is used when a page was never saved.

## Cache and privacy boundary

The service worker uses network-first navigation for public pages and
stale-while-revalidate for versioned static assets. Runtime page and asset
caches are bounded to prevent indefinite growth.

The worker does not intercept or cache API, Studio, sign-in, sign-up, login,
profile, developer, distribution, NJC+, employee-link, development-tool or
data-request routes. A PWA cache is an availability feature, never an
authorization boundary. Protected routes continue to require their normal
server-side authentication and authorization.

## Release checks

Run these from the repository root:

```bash
pnpm --filter @njcourier/web test
pnpm --filter @njcourier/web typecheck
pnpm --filter @njcourier/web lint
pnpm --filter @njcourier/web build
```

Production must use HTTPS. After deployment, validate install and offline
behavior on current Safari/iOS and Chrome/Android hardware, including at least
one notched phone, one small phone and one tablet. Confirm that the install
icon, shortcuts, safe areas, keyboard behavior, theme, account handoff,
notifications and cached-story fallback behave correctly.
