import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GoogleAdSenseScript } from "@/components/google-ads";
import { GoogleAnalytics } from "@/components/google-analytics";
import { AdBlockNotice } from "@/components/ad-block-notice";
import { CourierEasterEgg } from "@/components/courier-easter-egg";
import { hasAdFreeNjcPlusAccess } from "@/lib/advertising";
import {
  getSiteConfiguration,
  isGoogleAdsLive,
  isGoogleAnalyticsLive,
  normalizePublisherId,
} from "@/lib/site-settings";
import { isNjcPlusPublicEnabled } from "@/lib/feature-flags";
import { normalizeStudioHref } from "@/lib/site-account";
import { hasPublicStaffProfiles } from "@/lib/staff-profiles";

export const dynamic = "force-dynamic";

export default async function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const [configuration, plusEnabled, staffPageEnabled, adFree] = await Promise.all([
    getSiteConfiguration(),
    isNjcPlusPublicEnabled(),
    hasPublicStaffProfiles().catch((error) => {
      console.error("Public staff navigation lookup failed", error);
      return false;
    }),
    hasAdFreeNjcPlusAccess(),
  ]);
  const advertising = configuration.advertising;
  const googleAnalytics = configuration.measurement.googleAnalytics;
  const hasConfiguredSurface = advertising.autoAds || Object.values(advertising.placements).some((placement) => placement.enabled);
  const advertisingLive = !adFree && isGoogleAdsLive(configuration) && hasConfiguredSurface;
  return (
    <>
      <GoogleAnalytics
        enabled={isGoogleAnalyticsLive(configuration)}
        measurementId={googleAnalytics.measurementId}
      />
      <GoogleAdSenseScript enabled={advertisingLive} publisherId={normalizePublisherId(advertising.publisherId)} />
      <AdBlockNotice
        enabled={advertisingLive && advertising.adBlockNoticeEnabled}
        promoEnabled={advertising.adFreePromoEnabled}
        promoText={advertising.adFreePromoText}
        promoHref={advertising.adFreePromoHref}
      />
      <CourierEasterEgg configuration={configuration.easterEgg} />
      <SiteHeader
        publication={configuration.publication}
        navigation={configuration.navigation.filter(
          (item) => item.href !== "/staff" || staffPageEnabled,
        )}
        features={configuration.features}
        plusEnabled={plusEnabled}
        clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
        studioHref={normalizeStudioHref(process.env.NEXT_PUBLIC_STUDIO_URL)}
      />
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter
        publication={configuration.publication}
        features={configuration.features}
        staffPageEnabled={staffPageEnabled}
        easterEggEnabled={configuration.easterEgg.enabled}
      />
    </>
  );
}
