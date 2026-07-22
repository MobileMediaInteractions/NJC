# Google AdSense and site configuration

The web Studio provides an administrator-only, database-backed configuration area at `/studio/settings`. Changes are validated on the server, recorded in the API audit log and applied to the public masthead, navigation, footer, metadata, JSON-LD, RSS feed, news sitemap and shared configuration APIs.

## Configuration areas

- **Publication** controls the publication and short names, tagline, description, coverage region, primary city, state, newsroom desk, timezone and primary navigation.
- **Features** controls the advertised availability of comments, newsletters, alerts, live video, weather, membership and donations. Public web surfaces currently honor newsletter and weather visibility directly; other clients can consume the flags from `/api/v1/config`.
- **Google AdSense** controls the global advertising state, preview mode, Auto ads, publisher ID, `ads.txt` and the homepage, article and section ad units.

Only users with the Studio `admin` role may save configuration. Editors may inspect it but cannot mutate it. The existing `site_settings` Postgres table stores the versioned JSON document, so no provider-specific schema or secret is required.

## Safe activation sequence

1. Create or connect the external AdSense account and add the production site there.
2. Complete Google’s site review. An application cannot bypass or verify this external approval.
3. Configure Google Privacy & messaging or another Google-certified consent-management platform for regions where Google requires it.
4. Create responsive AdSense ad units and copy each 10-digit ad unit ID.
5. In Studio, keep **Preview mode** enabled while entering the publisher ID and placement IDs.
6. Enable `ads.txt`, deploy, and verify `/ads.txt` contains the expected DIRECT record.
7. Enable the desired placements or Auto ads and visually inspect representative article, section and homepage layouts.
8. Confirm the consent message is actually active, select **Google-certified privacy messaging is configured**, and only then disable Preview mode.

Preview mode uses local labeled placeholders. It does not load `pagead2.googlesyndication.com`, initialize an ad unit or generate test impressions. Live mode fails closed unless the global advertising flag, publisher ID and consent confirmation are all present. A manual placement also requires its own enabled flag and valid 10-digit unit ID.

## Publisher and ad-unit identifiers

Enter the publisher ID as `pub-1234567890123456` or `ca-pub-1234567890123456`; Studio normalizes it to the `ca-pub-…` client form. The generated `ads.txt` record removes only the `ca-` client prefix and uses Google’s documented certification authority ID:

```text
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

Publisher IDs and ad-unit IDs are public identifiers embedded in web markup; they are not AdSense passwords or API secrets. Never place Google account credentials in Studio or source control.

## Policy and operational requirements

- Ad units are separated from editorial content and labeled **Advertisement**.
- Do not encourage clicks, disguise ads as navigation, place ads on restricted content or alter Google’s rendering behavior.
- Keep ad density reasonable and verify keyboard, screen-reader, responsive and reduced-bandwidth behavior.
- Monitor layout shift, page speed, fill failures and Core Web Vitals after live activation.
- Keep the cookie policy and privacy choices accurate as Google settings, jurisdictions or data practices change.
- AdSense covers the website. Native iOS, Android and television advertising requires a separately reviewed native advertising approach; this integration does not inject web AdSense into those apps.

Useful Google references:

- [Copy the AdSense code](https://support.google.com/adsense/answer/9274019)
- [Auto ads](https://support.google.com/adsense/answer/9261805)
- [Google-certified consent requirements](https://support.google.com/adsense/answer/13554116)
- [Ad placement policies](https://support.google.com/adsense/answer/1346295)
- [AdSense program policies](https://support.google.com/adsense/answer/48182)
- [Create an ads.txt file](https://support.google.com/adsense/answer/12171612)
