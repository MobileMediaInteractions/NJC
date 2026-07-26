import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GoogleAdSenseScript } from "@/components/google-ads";
import { getSiteConfiguration, isGoogleAdsLive, normalizePublisherId } from "@/lib/site-settings";
import { isNjcPlusPublicEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const [configuration, plusEnabled] = await Promise.all([
    getSiteConfiguration(),
    isNjcPlusPublicEnabled(),
  ]);
  const advertising = configuration.advertising;
  const hasConfiguredSurface = advertising.autoAds || Object.values(advertising.placements).some((placement) => placement.enabled);
  return (
    <>
      <GoogleAdSenseScript enabled={isGoogleAdsLive(configuration) && hasConfiguredSurface} publisherId={normalizePublisherId(advertising.publisherId)} />
      <SiteHeader
        publication={configuration.publication}
        navigation={configuration.navigation}
        features={configuration.features}
        plusEnabled={plusEnabled}
        clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
        studioHref={process.env.NEXT_PUBLIC_STUDIO_URL ?? "/studio"}
      />
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter publication={configuration.publication} features={configuration.features} />
    </>
  );
}
