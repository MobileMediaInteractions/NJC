import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPublishedStories } from "@/lib/content";
import {
  authorProfilePageJsonLd,
  isSearchIndexingEnabled,
} from "@/lib/seo";
import { getSiteConfiguration } from "@/lib/site-settings";
import {
  getPublicStaffProfileBySlug,
  type PublicStaffProfile,
} from "@/lib/staff-profiles";

async function getProfileStories(profile: PublicStaffProfile) {
  const stories = await getPublishedStories({ limit: 100 });
  const normalizedName = profile.name.trim().toLocaleLowerCase("en-US");
  return stories.filter(
    (story) =>
      (profile.clerkId && story.author.id === profile.clerkId) ||
      story.author.name.trim().toLocaleLowerCase("en-US") === normalizedName,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicStaffProfileBySlug(slug);
  if (!profile) return {};

  const url = `/author/${profile.slug}`;
  const index = isSearchIndexingEnabled();
  return {
    title: profile.name,
    description: profile.description,
    alternates: { canonical: url },
    authors: [{ name: profile.name, url }],
    robots: { index, follow: index },
    openGraph: {
      type: "profile",
      locale: "en_US",
      url,
      title: `${profile.name} | The New Jersey Courier`,
      description: profile.description,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getPublicStaffProfileBySlug(slug);
  if (!profile) notFound();

  const [stories, configuration] = await Promise.all([
    getProfileStories(profile),
    getSiteConfiguration(),
  ]);
  const initials = profile.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="container-news py-12 lg:py-16">
      <JsonLd
        data={authorProfilePageJsonLd(
          profile,
          stories,
          configuration.publication,
        )}
      />
      <header className="max-w-3xl border-b-4 border-brand-navy pb-8">
        <p className="eyebrow text-brand-blue">Courier author</p>
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-24 border sm:size-28">
            <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-brand-navy text-2xl font-black text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-5xl font-black tracking-[-0.055em] text-brand-navy sm:text-6xl">
              {profile.name}
            </h1>
            {profile.title ? (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-brand-blue">
                {profile.title}
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {profile.description}
        </p>
      </header>

      <section className="pt-8" aria-labelledby="author-reporting">
        <h2
          id="author-reporting"
          className="text-3xl font-black tracking-[-0.04em] text-brand-navy"
        >
          Reporting by {profile.name}
        </h2>
        {stories.length ? (
          <div className="mt-7 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Published work attributed to this author will appear here.
          </p>
        )}
      </section>
    </main>
  );
}
