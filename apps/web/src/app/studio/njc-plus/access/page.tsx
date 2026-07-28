import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent, premiumTiers } from "@harborline/backend/schema";
import { NjcPlusAccessWorkspace } from "@/components/studio/njc-plus-access-workspace";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccessPage() {
  const viewer = await getStudioUser();
  if (viewer?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access management is restricted</CardTitle>
          <CardDescription>Administrator access is required because grants can unlock paid content.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [tiers, content] = hasDatabase()
    ? await Promise.all([
        getDb().select({
          value: premiumTiers.id,
          label: premiumTiers.name,
          description: premiumTiers.description,
        }).from(premiumTiers).limit(100),
        getDb().select({
          value: premiumContent.id,
          label: premiumContent.title,
          kind: premiumContent.kind,
          status: premiumContent.status,
        }).from(premiumContent).limit(500),
      ])
    : [[], []];

  return (
    <>
      <NjcPlusStudioHeading
        eyebrow="Entitlement authority"
        title="Access & invited beta"
        description="Manage paid-adjacent grants and a completely separate, temporary Invited Beta Tester entitlement with mandatory reasons and immutable audit history."
      />
      <NjcPlusAccessWorkspace
        mode="access"
        tierOptions={tiers}
        contentOptions={content.map((item) => ({
          value: item.value,
          label: item.label,
          description: `${item.kind} · ${item.status}`,
        }))}
      />
    </>
  );
}
