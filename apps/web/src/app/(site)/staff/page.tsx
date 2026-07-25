import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSiteOrigin } from "@/lib/origin";
import { listPublicStaffProfiles } from "@/lib/staff-profiles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Staff",
  description:
    "Meet the reporters, editors and newsroom staff behind The New Jersey Courier.",
  alternates: { canonical: "/staff" },
};

export default async function StaffPage() {
  const profiles = await listPublicStaffProfiles().catch((error) => {
    console.error("Public staff directory lookup failed", error);
    return [];
  });
  const url = `${getSiteOrigin()}/staff`;

  return (
    <main className="container-news py-12 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${url}#staff`,
          url,
          name: "The New Jersey Courier Staff",
          description:
            "The public newsroom directory for The New Jersey Courier.",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: profiles.map((profile, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${getSiteOrigin()}/author/${profile.slug}`,
              item: {
                "@type": "Person",
                name: profile.name,
                jobTitle: profile.title,
              },
            })),
          },
        }}
      />
      <header className="max-w-4xl border-b-4 border-brand-navy pb-8">
        <p className="eyebrow text-brand-blue">The people behind the Courier</p>
        <h1 className="mt-3 text-5xl font-black tracking-[-0.055em] text-brand-navy sm:text-6xl">
          Our staff
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          Meet the reporters, editors and newsroom staff working to provide
          independent, county-first journalism for New Jersey.
        </p>
      </header>

      {profiles.length ? (
        <section
          className="grid gap-x-8 gap-y-10 pt-10 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Courier staff directory"
        >
          {profiles.map((profile) => {
            const initials = profile.name
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <article
                key={profile.slug}
                className="border-t-2 border-brand-navy pt-5"
              >
                <Link
                  href={`/author/${profile.slug}`}
                  className="group block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="size-20 border">
                    <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="bg-brand-navy text-lg font-black text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.035em] text-brand-navy group-hover:underline">
                    {profile.name}
                  </h2>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-brand-blue">
                    {profile.title}
                  </p>
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                    {profile.description}
                  </p>
                </Link>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-10 border border-dashed px-6 py-14 text-center">
          <h2 className="text-xl font-black text-brand-navy">
            Staff profiles are being prepared
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Verified newsroom profiles will appear here automatically as staff
            members complete their public information.
          </p>
        </section>
      )}
    </main>
  );
}
