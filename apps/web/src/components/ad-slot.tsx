import { cn } from "@/lib/utils";

export function AdSlot({
  label = "Advertisement",
  size = "standard",
  className,
}: {
  label?: string;
  size?: "standard" | "leaderboard";
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex items-start justify-center bg-muted/35 pt-3",
        size === "leaderboard" ? "min-h-32 sm:min-h-44" : "min-h-28 border border-dashed border-brand-navy/20 bg-card/50",
        className,
      )}
      aria-label={label}
    >
      <div className="text-center">
        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {size === "standard" ? <p className="mt-1 text-xs text-muted-foreground/70">Reserved · currently disabled</p> : null}
      </div>
    </aside>
  );
}
