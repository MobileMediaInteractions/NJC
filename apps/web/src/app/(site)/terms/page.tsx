import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = { title: "Terms of use" };
export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Legal · Effective July 13, 2026"
      title="Terms of use"
      intro="These terms establish a US-first foundation for the website and mobile apps. They require entity-specific review before a public or commercial launch."
    >
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Agreement and eligibility
        </h2>
        <p className="mt-3">
          By using Harborline you agree to these Terms, the Privacy Policy and
          applicable posted rules. Account holders must be at least 13 and able
          to form a binding agreement; a parent or guardian must supervise
          minors where law requires.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          News, emergencies and no professional advice
        </h2>
        <p className="mt-3">
          Harborline aims for accurate, timely journalism but developing
          information can change. Do not rely on the service as the sole source
          for emergency instructions; follow official public-safety authorities.
          Weather, financial, medical and legal coverage is informational and
          not individualized professional advice.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Accounts and acceptable use
        </h2>
        <p className="mt-3">
          Keep credentials secure, compare device sync codes before approval and
          provide accurate information. You are responsible for televisions and
          browsers you connect until you sign them out or their sessions expire.
          You may not interfere with the service, scrape in ways that bypass
          controls, probe security, impersonate others, submit unlawful
          material, evade moderation or rate limits, or use reporting to harass
          sources, staff or community members.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Content and submissions
        </h2>
        <p className="mt-3">
          Harborline and its licensors retain rights in original reporting,
          design and media. You retain ownership of lawful submissions but grant{" "}
          <strong>[legal entity]</strong> a worldwide, nonexclusive,
          royalty-free license to host, review, display and distribute them for
          operating and reporting the service. Do not submit confidential tips
          through comments; use the designated secure channel.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Moderation and termination
        </h2>
        <p className="mt-3">
          We may label, restrict or remove content and suspend accounts to
          enforce these Terms, protect people, comply with law or preserve
          editorial integrity. Editorial decisions remain independent. See the{" "}
          <Link
            className="font-bold text-primary underline"
            href="/community-guidelines"
          >
            Community Guidelines
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Disclaimers, liability and disputes
        </h2>
        <p className="mt-3">
          To the extent permitted by law, the service is provided “as is”
          without warranties. Entity-specific limitations of liability,
          indemnity, governing law, venue, arbitration and class-action
          provisions are intentionally not fabricated here; qualified counsel
          must choose and conspicuously present them for the final company and
          markets.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-brand-navy">Contact</h2>
        <p className="mt-3">
          Legal notices: <strong>legal@harborline.example</strong>,{" "}
          <strong>[registered street address]</strong>. Both must be replaced
          before launch. Copyright notices follow the{" "}
          <Link className="font-bold text-primary underline" href="/dmca">
            DMCA process
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
