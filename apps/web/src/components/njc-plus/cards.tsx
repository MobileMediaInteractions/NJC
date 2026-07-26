import Image from "next/image";
import Link from "next/link";
import { Headphones, LockKeyhole, Play, Radio } from "lucide-react";
import type { PremiumContentRecord } from "@/lib/njc-plus";
import { premiumKindFormat, premiumKindLabel } from "@/lib/njc-plus";

export function PremiumCard({ item, priority = false, featured = false }: { item: PremiumContentRecord; priority?: boolean; featured?: boolean }) {
  const format = premiumKindFormat(item.kind);
  return <article className={featured ? "plus-card plus-card-featured" : "plus-card"}>
    <Link href={`/plus/${item.slug}`} aria-label={item.title}>
      <div className="plus-card-image">
        {item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt || ""} fill priority={priority} sizes={featured ? "(max-width: 900px) 100vw, 66vw" : "(max-width: 700px) 86vw, 30vw"} /> : <div className="plus-card-placeholder"><span>NJC+</span></div>}
        <span className="plus-card-format">{item.isLive ? <><Radio /> Live</> : format === "audio" ? <><Headphones /> {premiumKindLabel(item.kind)}</> : format === "video" ? <><Play /> {premiumKindLabel(item.kind)}</> : premiumKindLabel(item.kind)}</span>
        {item.paywallPolicy !== "free" ? <span className="plus-card-lock"><LockKeyhole /> Member</span> : null}
      </div>
      <div className="plus-card-copy"><p>{item.eyebrow}</p><h3>{item.title}</h3>{item.summary ? <span>{item.summary}</span> : null}</div>
    </Link>
  </article>;
}
