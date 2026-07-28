import { getDb, hasDatabase } from "@harborline/backend/db";
import { accessCreditRedemptionRules, premiumContent, premiumOffers, premiumTiers } from "@harborline/backend/schema";
import { NjcPlusCommerce } from "@/components/studio/njc-plus-commerce";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
export default async function CommercePage() {
  const viewer = await getStudioUser();
  const [tiers, offers, rules, content] = hasDatabase()
    ? await Promise.all([
        getDb().select().from(premiumTiers),
        getDb().select().from(premiumOffers),
        getDb().select().from(accessCreditRedemptionRules),
        getDb().select({
          value: premiumContent.id,
          label: premiumContent.title,
          kind: premiumContent.kind,
          status: premiumContent.status,
        }).from(premiumContent).limit(500),
      ])
    : [[], [], [], []];
  return <><NjcPlusStudioHeading eyebrow="Reusable commerce" title="Tiers, trials & pricing" description="Configure products and offers without scattering premium checks through frontend code."/><NjcPlusCommerce tiers={tiers} offers={offers} rules={rules} contentOptions={content.map((item) => ({ value: item.value, label: item.label, description: `${item.kind} · ${item.status}` }))} canManage={viewer?.role==="admin"}/></>;
}
