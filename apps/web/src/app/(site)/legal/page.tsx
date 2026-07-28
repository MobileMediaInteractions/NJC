import type { Metadata } from "next"; import Link from "next/link"; import { InfoPage } from "@/components/info-page";
import { getPublishedLegalEntries } from "@/lib/legal-center";
export const metadata: Metadata = { title: "Legal center" };
export const dynamic = "force-dynamic";
const links = [['Privacy policy','/privacy'],['Terms of use','/terms'],['Cookie policy','/cookies'],['Community guidelines','/community-guidelines'],['DMCA / copyright','/dmca'],['API terms','/api-terms'],['Developer agreement','/developer-agreement'],['Data requests','/data-requests'],['Accessibility','/accessibility']];
export default async function LegalPage() {
  const notices = await getPublishedLegalEntries();
  return (
    <InfoPage
      title="Legal and trust center"
      intro="Policies, reader rights and launch-readiness requirements for The New Jersey Courier’s website, apps, newsroom and developer platform."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-md border bg-card p-4 font-bold text-brand-navy hover:border-primary"
          >
            {label}
          </Link>
        ))}
      </div>
      {notices.map((notice) => (
        <section key={notice.id} id={notice.slug} className="scroll-mt-24">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Verified legal notice · Revision {notice.revision}
          </p>
          <h2 className="mt-2 text-2xl font-black text-brand-navy">
            {notice.title}
          </h2>
          <p className="mt-3 font-semibold text-brand-navy/75">
            {notice.summary}
          </p>
          <div className="mt-4 space-y-4">
            {notice.body.map((paragraph, index) => (
              <p key={`${notice.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Published{" "}
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "long",
              timeZone: "America/New_York",
            }).format(new Date(notice.publishedAt))}
          </p>
        </section>
      ))}
      <section>
        <h2 className="text-2xl font-black text-brand-navy">
          Before a real launch
        </h2>
        <p className="mt-3">
          Form the operating entity, name a privacy lead, appoint and register
          a DMCA agent if seeking safe-harbor protection, confirm insurance and
          employment policies, inventory vendors and data, approve retention
          schedules, establish incident response, and obtain counsel review in
          every served jurisdiction.
        </p>
      </section>
    </InfoPage>
  );
}
