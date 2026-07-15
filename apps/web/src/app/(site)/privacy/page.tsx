import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = { title: "Privacy policy" };
export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal · Effective July 13, 2026"
      title="Privacy policy"
      intro="This US-first launch baseline explains The New Jersey Courier’s planned data practices. The real legal entity, address, contacts, vendors and markets must be finalized with qualified counsel before launch."
    >
      <section className="rounded-md border border-amber-400/50 bg-amber-50 p-5 text-amber-950">
        <h2 className="font-black">Pre-launch legal placeholders</h2>
        <p className="mt-2">
          Controller/operator: <strong>[The New Jersey Courier legal entity name]</strong>,{" "}
          <strong>[registered street address]</strong>. Privacy contact:{" "}
          <strong>privacy@njcourier.com</strong>. These are fictional
          placeholders and do not create a real business contact.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Information we handle
        </h2>
        <p className="mt-3">
          Account and developer details may include name, verified email, Clerk
          identifier, role, API-key metadata and security events. Reader
          services may include newsletter choices, comments, tips, alert-device
          tokens, saved preferences, approximate region, request logs and
          privacy requests. Audience totals use a random or app-scoped
          pseudonymous installation identifier, Web/iOS/Android/tvOS/Android TV/Roku
          platform, app version, account link
          when authenticated and first/last-active timestamps. They do not store
          article-reading history or an advertising identifier. We do not store
          raw developer API keys after creation. Device sign-in handles
          short-lived pairing status, hashed sync codes and requester network
          information for abuse prevention. Apple TV, Android TV and Roku sessions retain account,
          device, expiry and last-active metadata; raw device tokens are not
          stored.{" "}
          Media press-kit requests include the requester’s name, organization,
          work email, intended use, requested materials, selected asset groups,
          generation status and archive size so the newsroom can fulfill and
          audit the request.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Why and how we use it
        </h2>
        <p className="mt-3">
          We use data to deliver news, authenticate accounts, operate the
          newsroom, securely connect browsers and televisions, send requested
          alerts, moderate participation, prevent abuse, measure platform
          adoption and reliability, satisfy legal obligations and improve
          services. Production counsel must document the applicable legal basis
          for each market, including consent, contract, legitimate interests and
          legal obligation where relevant.{" "}
          Press-kit request information is used for package generation, abuse
          prevention and appropriate media-relations follow-up; it is not added
          to a marketing list without separate consent.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Processors and transfers
        </h2>
        <p className="mt-3">
          The planned service uses Vercel for hosting and media, Neon for
          Postgres and Clerk for identity. Upstash handles developer rate
          limits. Expo, Apple and Google may process mobile build or
          notification data. Third-party analytics, advertising and payment
          providers are disabled until separately configured and disclosed.
          Cross-border transfer mechanisms must be reviewed for the final entity
          and audience.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Retention and security
        </h2>
        <p className="mt-3">
          Retention is limited to operational, editorial, security and legal
          needs. Unapproved pairing requests expire after ten minutes. Television
          sessions expire after 90 days unless renewed and can be revoked by
          signing out. Revoked API-key records and security audit logs may be
          retained to investigate abuse. Audience installation records are
          removed when a mobile reader disables measurement and the deletion
          request reaches The New Jersey Courier; website records can be addressed through a
          privacy request. Backups are encrypted and access-controlled; raw
          secrets are excluded. Final retention periods, incident contacts and
          breach-response duties must be approved before production.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Your choices and rights
        </h2>
        <p className="mt-3">
          Depending on location, you may request access, correction, deletion,
          portability, restriction, objection, or an opt-out from certain
          sharing or targeted advertising. The New Jersey Courier does not activate targeted
          advertising or sale/sharing of personal information in this launch
          build. We verify identity before fulfilling requests and will explain
          lawful exceptions.
        </p>
        <p className="mt-3">
          <Link
            href="/data-requests"
            className="font-bold text-primary underline"
          >
            Submit a privacy request
          </Link>{" "}
          or review{" "}
          <Link href="/cookies" className="font-bold text-primary underline">
            measurement and cookie choices
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">Children</h2>
        <p className="mt-3">
          Accounts and developer access are intended for people age 13 or older.
          The service is not directed to children under 13, and The New Jersey Courier does
          not knowingly collect their personal information through account
          features. Contact us to report a potentially underage account.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Updates and contact
        </h2>
        <p className="mt-3">
          Material changes will be dated and, when appropriate, notified
          in-product. Questions and appeals should go to{" "}
          <strong>privacy@njcourier.com</strong>; replace this address
          before launch.
        </p>
      </section>
    </InfoPage>
  );
}
