import { clerkClient } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  DistributionPackageConsole,
  type DistributionPackageDetail,
} from "@/components/studio/distribution-package-console";
import {
  getDistributionManager,
  getDistributionPackageForManager,
} from "@/lib/distribution";

export default async function StudioDistributionPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getDistributionManager())) notFound();
  const id = (await params).id;
  const record = await getDistributionPackageForManager(id);
  if (!record) notFound();
  const client = await clerkClient();
  const recipients = await Promise.all(
    record.grants.map((grant) =>
      client.users.getUser(grant.userClerkId).catch(() => null),
    ),
  );
  const serializable = JSON.parse(
    JSON.stringify({
      ...record,
      grants: record.grants.map((grant, index) => {
        const recipient = recipients[index];
        return {
          ...grant,
          recipient: {
            name:
              recipient?.fullName ??
              recipient?.username ??
              recipient?.primaryEmailAddress?.emailAddress ??
              "Unavailable account",
            email: recipient?.primaryEmailAddress?.emailAddress ?? null,
          },
        };
      }),
    }),
  ) as DistributionPackageDetail;
  return (
    <DistributionPackageConsole
      packageId={id}
      initialDetail={serializable}
    />
  );
}
