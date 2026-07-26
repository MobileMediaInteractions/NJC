import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { Check, ShieldCheck } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumOffers } from "@harborline/backend/schema";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { CheckoutButton } from "@/components/njc-plus/checkout-button";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { getVisiblePremiumTiers, resolveNjcPlusSurface } from "@/lib/njc-plus";
import { njcPlusBetaDisclosure } from "@/lib/njc-plus-beta-contract";
import { redirectUnavailableNjcPlus } from "@/lib/njc-plus-routing";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const surface = await resolveNjcPlusSurface({ preview, feature: "njc_plus_paywalls" });
  if (!surface.available) redirectUnavailableNjcPlus();
  const now = new Date();
  const [tiers, trialsFlag, checkoutFlag, offers] = await Promise.all([
    getVisiblePremiumTiers(surface.studioPreview),
    isNjcPlusFeatureEnabled("njc_plus_trials"),
    isNjcPlusFeatureEnabled("njc_plus_checkout"),
    hasDatabase() ? getDb().select().from(premiumOffers).where(and(
      surface.studioPreview ? undefined : eq(premiumOffers.active, true),
      or(isNull(premiumOffers.startsAt), lte(premiumOffers.startsAt, now)),
      or(isNull(premiumOffers.endsAt), gt(premiumOffers.endsAt, now)),
    )) : [],
  ]);
  const trialsEnabled = surface.studioPreview || trialsFlag;
  const checkoutEnabled = surface.studioPreview || checkoutFlag;
  return <><NjcPlusHeader studioPreview={surface.studioPreview} /><main className="plus-join"><header className="plus-shell"><p>Membership</p><h1>One signal. The whole story.</h1><span>Choose the access that fits. Every price, renewal and trial term is shown before checkout.</span></header><section className="plus-shell plus-tier-grid">{tiers.map((tier) => {
    const offer = trialsEnabled ? offers.find((item) => item.tierId === tier.id) : undefined;
    return <article key={tier.id} className="plus-tier"><p>{tier.name}</p><h2>{formatMoney(tier.priceCents, tier.currency)}<small>/{tier.interval}</small></h2><span>{tier.description}</span>{offer ? <div className="plus-trial"><strong>{formatMoney(offer.priceCents, tier.currency)} for {offer.durationDays} days</strong><p>{offer.promotionalText}</p><small>{offer.autoRenews ? `Then ${formatMoney(offer.renewalPriceCents ?? tier.priceCents, tier.currency)}/${tier.interval} until cancelled.` : "Does not renew automatically."}</small></div> : null}<ul>{tier.benefits.map((benefit) => <li key={benefit}><Check /> {benefit}</li>)}</ul>{checkoutEnabled || surface.studioPreview ? <CheckoutButton tierId={tier.id} offerId={offer?.id} /> : <p className="plus-checkout-paused">Checkout remains closed during setup.</p>}</article>;
  })}{!tiers.length ? <div className="plus-empty-library"><h2>Membership is not on sale yet.</h2><p>Studio must make at least one tier visible and available. No placeholder price is presented.</p></div> : null}</section><div className="plus-shell plus-trust"><ShieldCheck /><p>Server-verified access</p><span>Membership, trial, grant and content access are checked on the backend—not inferred from a button or badge.</span><small>{njcPlusBetaDisclosure}</small></div></main></>;
}
function formatMoney(cents: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100); }
