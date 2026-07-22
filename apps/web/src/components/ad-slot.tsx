import { cn } from "@/lib/utils";
import { GoogleAdUnit } from "@/components/google-ads";
import { getSiteConfiguration, isGoogleAdsLive, normalizePublisherId, type AdPlacementName } from "@/lib/site-settings";

export async function AdSlot({
  placement,
  label = "Advertisement",
  size = "standard",
  className,
}: {
  placement: AdPlacementName;
  label?: string;
  size?: "standard" | "leaderboard";
  className?: string;
}) {
  const configuration = await getSiteConfiguration();
  const advertising = configuration.advertising;
  const placementConfiguration = advertising.placements[placement];
  if (!advertising.enabled || !placementConfiguration.enabled) return null;

  const publisherId = normalizePublisherId(advertising.publisherId);
  const live = isGoogleAdsLive(configuration) && Boolean(placementConfiguration.slotId);
  if (live) {
    return <GoogleAdUnit publisherId={publisherId} slotId={placementConfiguration.slotId} format={size === "leaderboard" ? "horizontal" : "auto"} className={className} />;
  }

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
        <p className="mt-1 text-xs text-muted-foreground/70">Preview placement · Google is not loaded</p>
      </div>
    </aside>
  );
}
