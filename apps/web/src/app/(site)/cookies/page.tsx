import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = { title: "Cookie policy" };
export default function CookiesPage() {
  return (
    <InfoPage
      eyebrow="Legal · Effective July 13, 2026"
      title="Cookie and local-storage policy"
      intro="Harborline separates storage needed to operate the service from audience measurement."
    >
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Essential storage
        </h2>
        <p className="mt-3">
          Clerk may store authentication and fraud-prevention values. Harborline
          stores consent choices and interface preferences. The mobile app uses
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
          analytics.” When allowed, Harborline stores a random
          browser-installation identifier and reports its platform and
          last-active time. The mobile app reports a random installation
          identifier, operating platform, app version and last-active time;
          readers can disable and delete that record from Account → Privacy and
          support. Apple TV, Android TV and Roku report their platform, app version and
          last-active time as separate installation totals. These records do not include
          article-reading history or an advertising identifier.
        </p>
        <p className="mt-3">
          If a third-party analytics or advertising provider is added, this
          policy and the consent controls must identify its purpose, duration
          and recipients before activation.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">Change a choice</h2>
        <p className="mt-3">
          Clear the site’s local storage or browser data to reset the website
          consent banner. Use the mobile privacy switch to stop mobile
          measurement and request deletion of that installation record. A
          production consent-management system should add granular withdrawal
          and a “Your Privacy Choices” control in the footer for applicable
          markets.
        </p>
      </section>
    </InfoPage>
  );
}
