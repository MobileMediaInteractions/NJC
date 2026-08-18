import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumSubscriptions, premiumTiers } from "@harborline/backend/schema";
import { BillingPortalButton } from "@/components/njc-plus/billing-portal-button";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { getAccountIdentity } from "@/lib/auth";
import { resolveNjcPlusSurface } from "@/lib/njc-plus";
import { redirectUnavailableNjcPlus } from "@/lib/njc-plus-routing";
import { listAccountPreviews } from "@/lib/njc-plus-preview";
import Link from "next/link";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";

export default async function NjcPlusAccountPage() {
  if (!(await resolveNjcPlusSurface()).available) redirectUnavailableNjcPlus();
  const user = await getAccountIdentity();
  if (!user) redirect("/sign-in?redirect_url=/plus/account");
  const [subscriptions, previews] = hasDatabase()
    ? await Promise.all([getDb()
        .select({
          id: premiumSubscriptions.id,
          status: premiumSubscriptions.status,
          currentPeriodEndsAt: premiumSubscriptions.currentPeriodEndsAt,
          cancelAtPeriodEnd: premiumSubscriptions.cancelAtPeriodEnd,
          providerCustomerId: premiumSubscriptions.providerCustomerId,
          tierName: premiumTiers.name,
          priceCents: premiumTiers.priceCents,
          currency: premiumTiers.currency,
          interval: premiumTiers.interval,
        })
        .from(premiumSubscriptions)
        .innerJoin(
          premiumTiers,
          eq(premiumSubscriptions.tierId, premiumTiers.id),
        )
        .where(
          and(
            eq(premiumSubscriptions.userClerkId, user.clerkId),
            eq(premiumSubscriptions.provider, "stripe"),
          ),
        )
        .orderBy(desc(premiumSubscriptions.updatedAt)), isNjcPlusFeatureEnabled("njc_plus_preview_club").then((enabled) => enabled ? listAccountPreviews(user.clerkId) : [])])
    : [[], []] as const;
  const active = subscriptions.find((subscription) =>
    ["active", "trialing", "past_due"].includes(subscription.status),
  );

  return (
    <>
      <NjcPlusHeader />
      <main className="plus-join">
        <header className="plus-shell">
          <p>Account & billing</p>
          <h1>Your NJC+ membership.</h1>
          <span>
            Review the recorded membership state, then use Stripe’s secure
            customer portal for payment methods, invoices and cancellation.
          </span>
        </header>
        <section className="plus-shell plus-tier-grid">
          <article className="plus-tier">
            <p>{active ? active.tierName : "No active paid membership"}</p>
            <h2>
              {active
                ? `${formatMoney(active.priceCents, active.currency)}/${active.interval}`
                : "NJC+"}
            </h2>
            <span>
              {active
                ? `Status: ${active.status.replaceAll("_", " ")}${
                    active.currentPeriodEndsAt
                      ? ` · Current period ends ${active.currentPeriodEndsAt.toLocaleDateString()}`
                      : ""
                  }`
                : "No current Stripe subscription is connected to this account."}
            </span>
            {active?.cancelAtPeriodEnd ? (
              <p className="plus-checkout-paused">
                Cancellation is scheduled for the end of the current period.
              </p>
            ) : null}
            {subscriptions.some((subscription) => subscription.providerCustomerId) ? (
              <BillingPortalButton />
            ) : null}
          </article>
        </section>
        {previews.length ? <section id="courier-cut" className="plus-shell plus-account-previews"><p>Private early access</p><h2>The Courier Cut</h2><div>{previews.map(({ content, invitation, preview }) => <Link key={invitation.id} href={`/plus/${content.slug}`}><strong>{content.title}</strong><span>{invitation.status.replaceAll("_", " ")}{invitation.expiresAt ? ` · Expires ${invitation.expiresAt.toLocaleDateString()}` : preview.expiresAt ? ` · Expires ${preview.expiresAt.toLocaleDateString()}` : ""}</span></Link>)}</div><Link href="/plus/courier-cut">Open the Courier Cut screening room</Link></section> : null}
      </main>
    </>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
