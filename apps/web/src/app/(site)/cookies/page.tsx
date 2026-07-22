import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = { title: "Cookie policy" };
export default function CookiesPage() {
  return (
    <InfoPage
      eyebrow="Legal · Effective July 13, 2026"
      title="Cookie and local-storage policy"
      intro="The New Jersey Courier separates storage needed to operate the service from audience measurement."
    >
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Essential storage
        </h2>
        <p className="mt-3">
          Clerk may store authentication and fraud-prevention values. The New Jersey Courier
          stores consent choices, interface preferences and saved-story bookmarks. The mobile app uses
          on-device SQLite key-value storage for cached news, weather and
          bookmarks. Apple TV, Android TV and Roku use on-device storage for revocable
          sign-in tokens and installation identifiers. These functions are
          necessary or explicitly requested and cannot all be disabled without
          losing the related feature.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Audience measurement
        </h2>
        <p className="mt-3">
          Website measurement remains off until a visitor chooses “Allow
          analytics.” When allowed, The New Jersey Courier stores a random
          browser-installation identifier and reports its platform and
          last-active time. The mobile app reports a random installation
          identifier, operating platform, app version and last-active time;
          readers can disable and delete that record from Account → Privacy and
          support. Apple TV, Android TV and Roku report their platform, app version and
          last-active time as separate installation totals. These records do not include
          article-reading history or an advertising identifier.
        </p>
        <p className="mt-3">
          Google AdSense is available to the publisher but remains disabled by
          default. If the publisher activates it, Google may use cookies or
          similar technologies to deliver, measure and protect advertising.
          Live delivery is blocked in Studio until an administrator confirms a
          Google-certified consent platform has been configured. The site’s
          separate audience-measurement preference does not replace the consent
          choices required for personalized or non-personalized advertising.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">Change a choice</h2>
        <p className="mt-3">
          Clear the site’s local storage or browser data to reset the website
          consent banner. Use the mobile privacy switch to stop mobile
          measurement and request deletion of that installation record. A
          Google’s privacy message provides advertising choices when AdSense is
          active. Clear the site’s browser data or use that message’s privacy
          controls to revisit an advertising choice. The footer’s “Privacy
          choices” link provides the publication’s data-request process.
        </p>
      </section>
    </InfoPage>
  );
}
