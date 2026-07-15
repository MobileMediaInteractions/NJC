import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { brandAssets } from "@/lib/assets";

export function BrandMark({
  inverse = false,
  compact = false,
  className,
}: {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="The New Jersey Courier home"
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
            NJ Courier
          </span>
          <span
            className={cn(
              "mt-1 text-[0.57rem] font-bold uppercase tracking-[0.29em]",
              inverse ? "text-white/70" : "text-brand-blue",
            )}
          >
            Middlesex County
          </span>
        </span>
      )}
    </Link>
  );
}
