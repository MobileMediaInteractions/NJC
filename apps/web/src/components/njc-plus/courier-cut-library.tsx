import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, Eye, LockKeyhole } from "lucide-react";
import { premiumKindLabel, type PremiumContentRecord } from "@/lib/njc-plus";

export type CourierCutLibraryItem = {
  id: string;
  href: string;
  title: string;
  summary: string;
  eyebrow: string;
  kind: PremiumContentRecord["kind"];
  imageUrl: string | null;
  imageAlt: string | null;
  status: string;
  expiresAt: Date | null;
};

export function CourierCutLibrary({
  items,
  emptyTitle,
  emptyCopy,
}: {
  items: CourierCutLibraryItem[];
  emptyTitle: string;
  emptyCopy: string;
}) {
  if (!items.length) {
    return (
      <section className="plus-shell plus-cut-empty">
        <LockKeyhole />
        <p>Invitation required</p>
        <h2>{emptyTitle}</h2>
        <span>{emptyCopy}</span>
      </section>
    );
  }

  return (
    <section className="plus-shell plus-cut-library" aria-label="Your Courier Cut invitations">
      {items.map((item) => (
        <article key={item.id}>
          <Link href={item.href} aria-label={`Open ${item.title}`}>
            <div className="plus-cut-image">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt || ""}
                  fill
                  sizes="(max-width: 800px) 100vw, 42vw"
                />
              ) : (
                <span>The Courier Cut</span>
              )}
              <small><Eye /> Private preview</small>
            </div>
            <div className="plus-cut-copy">
              <p>{item.eyebrow || premiumKindLabel(item.kind)}</p>
              <h2>{item.title}</h2>
              <span>{item.summary}</span>
              <div>
                <small>{item.status.replaceAll("_", " ")}</small>
                {item.expiresAt ? (
                  <small><Clock3 /> Expires {item.expiresAt.toLocaleDateString()}</small>
                ) : null}
                <strong>Open cut <ArrowRight /></strong>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </section>
  );
}
