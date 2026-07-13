import Link from "next/link";
import { cn } from "@/lib/utils";

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
      aria-label="Harborline Local home"
    >
      <span
        className={cn(
          "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.3rem] border-2",
          inverse ? "border-white bg-white" : "border-brand-navy bg-brand-navy",
        )}
        aria-hidden="true"
      >
        <span className="absolute bottom-[5px] left-[6px] h-1.5 w-6 -rotate-6 rounded-full bg-brand-yellow" />
        <span
          className={cn(
            "absolute left-[13px] top-[5px] h-6 w-[3px] -rotate-3",
            inverse ? "bg-brand-navy" : "bg-white",
          )}
        />
        <span
          className={cn(
            "absolute left-[16px] top-[7px] size-0 border-b-[9px] border-l-[11px] border-t-[9px] border-b-transparent border-t-transparent",
            inverse ? "border-l-brand-navy" : "border-l-white",
          )}
        />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[1.15rem] font-black uppercase tracking-[-0.045em]",
              inverse ? "text-white" : "text-brand-navy",
            )}
          >
            Harborline
          </span>
          <span
            className={cn(
              "mt-1 text-[0.57rem] font-bold uppercase tracking-[0.29em]",
              inverse ? "text-white/70" : "text-brand-blue",
            )}
          >
            Local News
          </span>
        </span>
      )}
    </Link>
  );
}
