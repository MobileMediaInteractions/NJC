import Link from "next/link";
import { ArrowLeft, Download, LockKeyhole } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DistributionFileViewer } from "@/components/distribution/distribution-file-viewer";
import {
  getAuthorizedDistributionFile,
  getDistributionIdentity,
  isDistributionEnabled,
} from "@/lib/distribution";

export default async function DistributionFilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isDistributionEnabled())) notFound();
  const identity = await getDistributionIdentity();
  if (!identity) redirect("/sign-in?redirect_url=/distribution");
  const file = await getAuthorizedDistributionFile(
    identity.clerkId,
    (await params).id,
  );
  if (!file) notFound();
  return (
    <main className="distribution-file-page">
      <div className="distribution-file-bar">
        <Link href={`/distribution/package/${file.packageSlug}`}>
          <ArrowLeft /> {file.packageTitle}
        </Link>
        <div>
          <p>{file.itemTitle}</p>
          <span>
            <LockKeyhole /> Authorized preview
          </span>
        </div>
        {file.downloadAllowed ? (
          <a href={`/api/v1/distribution/files/${file.id}/download`}>
            <Download /> Download
          </a>
        ) : (
          <span>View only</span>
        )}
      </div>
      <DistributionFileViewer file={file} />
      {file.itemDescription ? (
        <section className="distribution-file-notes">
          <p>About this file</p>
          <h1>{file.itemTitle}</h1>
          <span>{file.itemDescription}</span>
          {file.embargoAt ? (
            <strong>Embargoed until {file.embargoAt.toLocaleString()}</strong>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
