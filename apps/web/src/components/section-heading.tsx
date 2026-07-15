import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  title,
  href,
  kicker,
}: {
  title: string;
  href?: string;
  kicker?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-t-4 border-brand-navy pt-3">
      <div>
        {kicker ? (
          <p className="eyebrow mb-2 text-brand-blue">{kicker}</p>
        ) : null}
        <h2 className="text-2xl font-black leading-none tracking-[-0.035em] text-brand-navy sm:text-3xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="mb-1 flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue hover:underline"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
