import type { Metadata } from "next";
import { TvPairingApproval } from "@/components/device-pairing/tv-pairing-approval";
import { isClerkConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Connect Apple TV",
  robots: { index: false, follow: false },
};

export default async function TvLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; code?: string }>;
}) {
  const params = await searchParams;
  if (!isClerkConfigured())
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-3xl font-black">
          Apple TV sign-in is ready to configure
        </h1>
        <p className="mt-4 leading-7 text-white/70">
          Connect Clerk, Postgres, and DEVICE_PAIRING_PEPPER in Vercel to
          activate secure device pairing.
        </p>
      </div>
    );
  return (
    <TvPairingApproval
      initialSession={params.session ?? ""}
      initialCode={params.code ?? ""}
    />
  );
}
