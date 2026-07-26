import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GoogleAdSenseScript } from "@/components/google-ads";
import { getSiteAccountState } from "@/lib/auth";
import { getSiteConfiguration, isGoogleAdsLive, normalizePublisherId } from "@/lib/site-settings";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { resolveNjcPlusSurface, resolvePremiumAccess } from "@/lib/njc-plus";
import { resolveSiteAccountAction } from "@/lib/site-account";

export const dynamic = "force-dynamic";

export default async function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const [configuration, plusSurface, premiumAccess, accountState] = await Promise.all([
    getSiteConfiguration(),
    resolveNjcPlusSurface(),
    resolvePremiumAccess(),
    getSiteAccountState(),
  ]);
  const plusEnabled = plusSurface.available;
  const globalMemberBranding = plusEnabled && await isNjcPlusFeatureEnabled("njc_plus_membership_branding");
  const memberBranding = premiumAccess.entitlementType === "invited_beta_tester"
    ? premiumAccess.memberBranding
    : globalMemberBranding && premiumAccess.memberBranding;
  const accountAction = resolveSiteAccountAction(
    accountState,
    process.env.NEXT_PUBLIC_STUDIO_URL ?? "/studio",
  );
  const advertising = configuration.advertising;
  const hasConfiguredSurface = advertising.autoAds || Object.values(advertising.placements).some((placement) => placement.enabled);
  return (
    <div className={memberBranding ? "njc-plus-member-state" : undefined}>
      <GoogleAdSenseScript enabled={isGoogleAdsLive(configuration) && hasConfiguredSurface} publisherId={normalizePublisherId(advertising.publisherId)} />
      <SiteHeader publication={configuration.publication} navigation={configuration.navigation} features={configuration.features} plusEnabled={plusEnabled} accountAction={accountAction} />
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter publication={configuration.publication} features={configuration.features} />
    </div>
  );
}
