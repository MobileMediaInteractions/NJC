export function AdSlot({ label = "Advertisement" }: { label?: string }) {
  return (
    <aside className="flex min-h-28 items-center justify-center border border-dashed border-brand-navy/20 bg-white/50" aria-label={label}>
      <div className="text-center">
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Reserved · currently disabled</p>
      </div>
    </aside>
  );
}
