import type { Metadata } from "next";
import {
  Award,
  CalendarDays,
  GraduationCap,
  HeartHandshake,
  UsersRound,
} from "lucide-react";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  twentyUnderTwentyPrograms,
  twentyUnderTwentySubmissions,
} from "@harborline/backend/schema";
import { JsonLd } from "@/components/json-ld";
import { TwentyUnderTwentyForm } from "@/components/twenty-under-twenty-form";
import { getSiteOrigin } from "@/lib/origin";
import { isIntakeOpen } from "@/lib/twenty-under-twenty";

export const metadata: Metadata = {
  title: "20 Under 20",
  description:
    "The New Jersey Courier’s 20 Under 20 initiative honors 20 exceptional New Jersey high school students who serve their communities.",
  alternates: { canonical: "/20-under-20" },
  openGraph: {
    title: "20 Under 20 | The New Jersey Courier",
    description:
      "Celebrating exceptional young people who give back to New Jersey communities.",
    type: "website",
    url: "/20-under-20",
  },
};

export const dynamic = "force-dynamic";

export default async function TwentyUnderTwentyPage() {
  const origin = getSiteOrigin();
  const url = `${origin}/20-under-20`;
  const { program, honorees } = await loadProgram();
  const year = program?.year ?? 2026;
  const classSize = program?.classSize ?? 20;
  const ageLimit = program?.ageLimit ?? 20;
  const nominationsOpen = program
    ? isIntakeOpen(program, "educator_nomination")
    : false;
  const applicationsOpen = program
    ? isIntakeOpen(program, "student_application")
    : false;
  const selectionSteps = [
    {
      number: "01",
      title: "Educator nominations",
      description:
        "Educator sponsors identify students whose service and leadership deserve statewide recognition.",
    },
    {
      number: "02",
      title: "Student applications",
      description:
        "Students share their work, the communities they serve, and the impact they hope to make.",
    },
    {
      number: "03",
      title: "Advisory review",
      description:
        `A Courier advisory panel reviews eligible nominations and applications to select the class of ${year}.`,
    },
  ] as const;

  return (
    <div className="pb-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${url}#page`,
          url,
          name: "20 Under 20",
          description:
            "The New Jersey Courier initiative honoring exceptional New Jersey high school students under age 20.",
          isPartOf: {
            "@type": "WebSite",
            name: "The New Jersey Courier",
            url: origin,
          },
          about: {
            "@type": "Thing",
            name: "Youth community leadership in New Jersey",
          },
        }}
      />

      <section className="overflow-hidden bg-brand-navy text-white">
        <div className="container-news relative grid min-h-[34rem] items-end gap-10 py-14 md:grid-cols-[1.35fr_0.65fr] md:py-20">
          <div
            className="pointer-events-none absolute -right-32 -top-36 size-[34rem] rounded-full border-[5rem] border-white/[0.035]"
            aria-hidden="true"
          />
          <div className="relative max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-yellow">
              The class of {year}
            </p>
            <h1 className="mt-5 max-w-3xl text-7xl font-black leading-[0.82] tracking-[-0.075em] sm:text-8xl lg:text-9xl">
              20
              <span className="block text-brand-yellow">Under 20</span>
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-8 text-white/75 md:text-2xl md:leading-9">
              A spotlight on exceptional young people who give back, lead with
              purpose, and make New Jersey stronger.
            </p>
          </div>

          <div className="relative border-l-2 border-brand-yellow pl-6 md:mb-2">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-yellow">
              New Jersey&apos;s exceptional young people
            </p>
            <p className="mt-4 text-base leading-7 text-white/70">
              {classSize} students. One statewide class. A celebration of service,
              character, and the belief that meaningful leadership can begin at
              any age.
            </p>
          </div>
        </div>
      </section>

      <main className="container-news">
        <section className="grid gap-10 border-b py-14 lg:grid-cols-[0.7fr_1.3fr] lg:py-20">
          <div>
            <p className="eyebrow text-brand-blue dark:text-primary">Why it exists</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-brand-navy dark:text-foreground sm:text-5xl">
              Recognition for service that matters
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-8 text-muted-foreground">
            <p>
              In 2026, The New Jersey Courier created 20 Under 20 to honor
              exceptional New Jersey high school students under the age of {ageLimit}.
            </p>
            <p>
              The initiative brings a spotlight to young people across the
              state who consistently give back to their communities and
              exemplify what it means to be a global citizen.
            </p>
          </div>
        </section>

        <section className="py-14 lg:py-20" aria-labelledby="selection-heading">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-blue dark:text-primary">The selection process</p>
            <h2
              id="selection-heading"
              className="mt-3 text-4xl font-black tracking-[-0.05em] text-brand-navy dark:text-foreground sm:text-5xl"
            >
              From nomination to the class of {year}
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Selection combines the perspective of educator sponsors with the
              students&apos; own accounts of their work and impact.
            </p>
          </div>

          <ol className="mt-10 grid gap-px overflow-hidden border bg-border lg:grid-cols-3">
            {selectionSteps.map((step) => (
              <li key={step.number} className="bg-background p-7 sm:p-9">
                <span className="font-mono text-sm font-black text-brand-blue dark:text-primary">
                  {step.number}
                </span>
                <h3 className="mt-8 text-2xl font-black tracking-[-0.035em] text-brand-navy dark:text-foreground">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid overflow-hidden bg-[#204f3f] text-white lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 sm:p-12 lg:p-16">
            <Award className="size-10 text-brand-yellow" aria-hidden="true" />
            <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">
              A statewide celebration
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Honoring the full class
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              {program?.eventAt
                ? `The recognition event is scheduled for ${formatDate(program.eventAt)}${program.eventLocation ? ` at ${program.eventLocation}` : ""}.`
                : `A recognition event will honor the 20 Under 20 class of ${year}.`}{" "}
              {program?.keynoteSpeaker
                ? `${program.keynoteSpeaker} is scheduled to deliver the keynote.`
                : "Event and keynote details will be announced when finalized."}{" "}
              The Courier will also share the students&apos; accomplishments
              with the wider community.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-white/15">
            <ProgramFact
              icon={<GraduationCap />}
              label="Eligibility"
              value={program?.eligibilitySummary ?? `New Jersey high school students under ${ageLimit}`}
            />
            <ProgramFact
              icon={<UsersRound />}
              label="Class size"
              value={`${classSize} students selected statewide`}
            />
            <ProgramFact
              icon={<HeartHandshake />}
              label="Focus"
              value="Service, community impact, and citizenship"
            />
            <ProgramFact
              icon={<CalendarDays />}
              label="Recognition"
              value={program?.eventAt ? formatDate(program.eventAt) : `Details for ${year} to come`}
            />
          </div>
        </section>

        {program?.status === "announced" && honorees.length ? (
          <section className="py-16 lg:py-24" aria-labelledby="honoree-heading">
            <p className="eyebrow text-brand-blue dark:text-primary">The class of {year}</p>
            <h2 id="honoree-heading" className="mt-3 text-4xl font-black tracking-[-0.05em] text-brand-navy dark:text-foreground sm:text-5xl">
              Meet the honorees
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {honorees.map((honoree) => (
                <article key={`${honoree.name}-${honoree.school}`} className="overflow-hidden border bg-card">
                  {honoree.photoUrl ? (
                    <div
                      className="aspect-[4/3] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${honoree.photoUrl.replaceAll('"', "%22")}")` }}
                      role="img"
                      aria-label={`Portrait of ${honoree.name}`}
                    />
                  ) : null}
                  <div className="p-6">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue dark:text-primary">{honoree.county} County</p>
                    <h3 className="mt-2 text-2xl font-black text-brand-navy dark:text-foreground">{honoree.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{honoree.school} · {honoree.city}</p>
                    <p className="mt-5 leading-7 text-muted-foreground">{honoree.bio}</p>
                    {honoree.quote ? <blockquote className="mt-5 border-l-2 border-brand-yellow pl-4 italic">&ldquo;{honoree.quote}&rdquo;</blockquote> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-5xl py-16 lg:py-24">
          <div className={nominationsOpen || applicationsOpen ? "" : "text-center"}>
            <p className="eyebrow text-brand-blue dark:text-primary">Nominations and applications</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-brand-navy dark:text-foreground sm:text-5xl">
              {nominationsOpen
                ? `Nominate a student for the class of ${year}`
                : applicationsOpen
                  ? `Apply for the class of ${year}`
                  : program?.status === "review"
                    ? "The advisory review is underway"
                    : program?.status === "announced"
                      ? `The class of ${year} has been announced`
                      : "Program details are coming"}
            </h2>
            <p className={`mt-5 max-w-2xl text-lg leading-8 text-muted-foreground ${nominationsOpen || applicationsOpen ? "" : "mx-auto"}`}>
              {nominationsOpen
                ? "Educators may submit one complete nomination at a time. The Courier verifies eligibility before advisory review."
                : applicationsOpen
                  ? "Students may submit their own account of their service, leadership, and community impact."
                  : program?.description || "Eligibility guidance, nomination materials, application requirements, key dates, and event information will be published here when they are finalized."}
            </p>
          </div>
          {nominationsOpen ? <div className="mt-10"><TwentyUnderTwentyForm kind="educator_nomination" year={year} /></div> : null}
          {applicationsOpen ? <div className="mt-10"><TwentyUnderTwentyForm kind="student_application" year={year} /></div> : null}
        </section>
      </main>
    </div>
  );
}

async function loadProgram() {
  if (!hasDatabase()) return { program: null, honorees: [] };
  try {
    const [program] = await getDb()
      .select()
      .from(twentyUnderTwentyPrograms)
      .orderBy(desc(twentyUnderTwentyPrograms.year))
      .limit(1);
    if (!program) return { program: null, honorees: [] };
    const rows = program.status === "announced"
      ? await getDb()
          .select({ snapshot: twentyUnderTwentySubmissions.honoreeSnapshot })
          .from(twentyUnderTwentySubmissions)
          .where(and(
            eq(twentyUnderTwentySubmissions.programId, program.id),
            eq(twentyUnderTwentySubmissions.status, "selected"),
            isNotNull(twentyUnderTwentySubmissions.publishedAt),
          ))
      : [];
    return {
      program,
      honorees: rows.flatMap((row) => row.snapshot ? [row.snapshot] : []),
    };
  } catch (error) {
    console.error("20 Under 20 public lookup failed", error);
    return { program: null, honorees: [] };
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(value);
}

function ProgramFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-48 bg-brand-navy/45 p-6 sm:p-8">
      <div className="text-brand-yellow [&_svg]:size-7" aria-hidden="true">
        {icon}
      </div>
      <p className="mt-8 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-white">{value}</p>
    </div>
  );
}
