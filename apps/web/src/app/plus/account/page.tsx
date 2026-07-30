import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumSubscriptions, premiumTiers } from "@harborline/backend/schema";
import { BillingPortalButton } from "@/components/njc-plus/billing-portal-button";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { getAccountIdentity } from "@/lib/auth";
import { resolveNjcPlusSurface } from "@/lib/njc-plus";
import { redirectUnavailableNjcPlus } from "@/lib/njc-plus-routing";

export default async function NjcPlusAccountPage() {
  if (!(await resolveNjcPlusSurface()).available) redirectUnavailableNjcPlus();
  const user = await getAccountIdentity();
  if (!user) redirect("/sign-in?redirect_url=/plus/account");
  const subscriptions = hasDatabase()
    ? await getDb()
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
        .orderBy(desc(premiumSubscriptions.updatedAt))
    : [];
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
