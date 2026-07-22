import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { brandAssets } from "@/lib/assets";
import type { SiteConfiguration } from "@/lib/site-settings";

export function BrandMark({
  inverse = false,
  compact = false,
  className,
  publication,
}: {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  publication?: SiteConfiguration["publication"];
}) {
  const shortName = publication?.shortName ?? "NJ Courier";
  const region = publication?.region ?? "Middlesex County";
  const accessibleName = publication?.name ?? "The New Jersey Courier";
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label={`${accessibleName} home`}
    >
      <Image src={brandAssets.mark} alt="" width={40} height={40} className="size-10 shrink-0 rounded-[0.2rem]" aria-hidden="true" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[1.15rem] font-black uppercase tracking-[-0.045em]",
              inverse ? "text-white" : "text-brand-navy",
            )}
          >
            {shortName}
          </span>
          <span
            className={cn(
              "mt-1 text-[0.57rem] font-bold uppercase tracking-[0.29em]",
              inverse ? "text-white/70" : "text-brand-blue",
            )}
          >
            {region}
          </span>
        </span>
      )}
    </Link>
  );
}
