import { desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { distributionPackages } from "@harborline/backend/schema";
import { DistributionConsole } from "@/components/studio/distribution-console";
import { StudioShell } from "@/components/studio/studio-shell";
import {
  getDistributionManager,
  isDistributionEnabled,
} from "@/lib/distribution";
import { hasPrivateBlobStorage } from "@/lib/blob-storage";

export default async function StudioDistributionPage() {
  const manager = await getDistributionManager();
  if (!manager) notFound();
  const packages = hasDatabase()
    ? await getDb()
        .select()
        .from(distributionPackages)
        .orderBy(desc(distributionPackages.updatedAt))
    : [];
  return (
    <StudioShell viewer={manager}>
      <DistributionConsole
        packages={packages}
        readiness={{
          deliveryEnabled: await isDistributionEnabled(),
          databaseReady: hasDatabase(),
          privateStorageReady: hasPrivateBlobStorage(),
        }}
      />
    </StudioShell>
  );
}
