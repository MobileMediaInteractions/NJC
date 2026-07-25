import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { getAuthorProfileBySlug } from "@/lib/authors";
import { getPublishedStories } from "@/lib/content";
import {
  authorProfilePageJsonLd,
  isSearchIndexingEnabled,
} from "@/lib/seo";
import { getSiteConfiguration } from "@/lib/site-settings";

async function getProfileStories(name: string) {
  const stories = await getPublishedStories({ limit: 100 });
  const normalizedName = name.trim().toLocaleLowerCase("en-US");
  return stories.filter(
    (story) =>
      story.author.name.trim().toLocaleLowerCase("en-US") === normalizedName,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = getAuthorProfileBySlug(slug);
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
  const profile = getAuthorProfileBySlug(slug);
  if (!profile) notFound();

  const [stories, configuration] = await Promise.all([
    getProfileStories(profile.name),
    getSiteConfiguration(),
  ]);

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
        <h1 className="mt-3 text-5xl font-black tracking-[-0.055em] text-brand-navy sm:text-6xl">
          {profile.name}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
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
