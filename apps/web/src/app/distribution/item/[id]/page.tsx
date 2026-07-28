import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import {
  getAuthorizedDistributionStoryItem,
  getDistributionIdentity,
  isDistributionEnabled,
} from "@/lib/distribution";

export default async function DistributionStoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isDistributionEnabled())) notFound();
  const identity = await getDistributionIdentity();
  if (!identity) redirect("/sign-in?redirect_url=/distribution");
  const record = await getAuthorizedDistributionStoryItem(
    identity.clerkId,
    (await params).id,
  );
  if (!record) notFound();
  return (
    <main className="distribution-story-preview">
      <Link href={`/distribution/package/${record.package.slug}`}>
        <ArrowLeft /> {record.package.title}
      </Link>
      <article>
        <header>
          <p>
            <LockKeyhole /> Private advance story · {record.story.categoryLabel}
          </p>
          <h1>{record.story.headline}</h1>
          <span>{record.story.dek}</span>
        </header>
        <div>
          {record.story.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
