import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityBulletinDetail } from "@/components/community-bulletin-detail";
import { communityBulletinPath } from "@/lib/community-public-model";
import { getPublicCommunityBulletin } from "@/lib/public-community";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function loadBulletin(slug: string) {
  const configuration = await getSiteConfiguration();
  if (!configuration.features.community) notFound();
  const bulletin = await getPublicCommunityBulletin(slug);
  if (!bulletin) notFound();
  return { bulletin, configuration };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bulletin } = await loadBulletin((await params).slug);
  const description = bulletin.description.replace(/\s+/g, " ").slice(0, 180);
  const path = communityBulletinPath(bulletin.slug);
  return {
    title: `${bulletin.title} | In the Community`, description,
    alternates: { canonical: path },
    openGraph: { title: bulletin.title, description, url: path, type: "website" },
    twitter: { card: "summary", title: bulletin.title, description },
  };
}

export default async function CommunityBulletinPage({ params }: Props) {
  const { bulletin, configuration } = await loadBulletin((await params).slug);
  return <CommunityBulletinDetail bulletin={bulletin} timezone={configuration.publication.timezone} />;
}
