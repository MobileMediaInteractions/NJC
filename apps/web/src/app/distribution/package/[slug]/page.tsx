import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileAudio,
  FileImage,
  FileText,
  FileVideo2,
  LockKeyhole,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DistributionOrganizer } from "@/components/distribution/distribution-organizer";
import {
  getAuthorizedDistributionPackage,
  getDistributionIdentity,
  isDistributionEnabled,
} from "@/lib/distribution";

export default async function DistributionPackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await isDistributionEnabled())) notFound();
  const identity = await getDistributionIdentity();
  if (!identity) redirect("/sign-in?redirect_url=/distribution");
  const record = await getAuthorizedDistributionPackage(
    identity.clerkId,
    (await params).slug,
  );
  if (!record) notFound();
  return (
    <main className="distribution-detail">
      <Link href="/distribution" className="distribution-back">
        <ArrowLeft /> Back to library
      </Link>
      <header>
        <div>
          <p>Private release package</p>
          <h1>{record.title}</h1>
          <span>{record.description}</span>
        </div>
        <aside>
          {record.embargoAt ? (
            <p>
              <CalendarClock />
              <span>
                Embargoed until
                <strong>{record.embargoAt.toLocaleString()}</strong>
              </span>
            </p>
          ) : null}
          <p>
            <LockKeyhole />
            <span>
              Download policy
              <strong>
                {record.downloadAllowed ? "Authorized" : "View only"}
              </strong>
            </span>
          </p>
        </aside>
      </header>
      {record.termsText ? (
        <section className="distribution-terms">
          <strong>Release terms</strong>
          <p>{record.termsText}</p>
        </section>
      ) : null}
      <section className="distribution-package-items">
        <div>
          <p>Package contents</p>
          <h2>
            {record.items.length} item{record.items.length === 1 ? "" : "s"}
          </h2>
        </div>
        {record.items.length ? (
          <div>
            {record.items.map((item, index) => {
              const Icon = item.file
                ? mediaIcon(item.file.mimeType)
                : FileText;
              const href = item.file
                ? `/distribution/file/${item.file.id}`
                : `/distribution/item/${item.id}`;
              return (
                <article key={item.id}>
                  <Link href={href}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <Icon />
                    <div>
                      <p>{item.file?.mimeType ?? "Advance story"}</p>
                      <h3>{item.title}</h3>
                      <small>
                        {item.description ||
                          (item.file
                            ? formatBytes(item.file.size)
                            : item.story?.dek)}
                      </small>
                    </div>
                  </Link>
                  <DistributionOrganizer
                    itemId={item.id}
                    initialCollection={item.collection}
                    initialFavorite={item.favorite}
                  />
                  {item.file && record.downloadAllowed ? (
                    <a
                      href={`/api/v1/distribution/files/${item.file.id}/download`}
                      className="distribution-download"
                    >
                      <Download /> Download
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="distribution-empty">
            <FileText />
            <h2>This package is being prepared</h2>
            <p>No files or stories are currently available.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function mediaIcon(mime: string) {
  if (mime.startsWith("video/")) return FileVideo2;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.startsWith("image/")) return FileImage;
  return FileText;
}

function formatBytes(value: number) {
  const units = ["B", "KB", "MB", "GB"];
  if (!value) return "0 B";
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
