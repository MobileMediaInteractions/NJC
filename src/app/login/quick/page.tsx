import type { Metadata } from "next";
import { QuickWebSignIn } from "@/components/device-pairing/quick-web-sign-in";
import { isClerkConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Quick sign-in",
  robots: { index: false, follow: false },
};

export default function QuickLoginPage() {
  if (!isClerkConfigured())
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-3xl font-black">
          Quick sign-in is ready to configure
        </h1>
        <p className="mt-4 leading-7 text-white/70">
          Connect Clerk, Postgres, and DEVICE_PAIRING_PEPPER in Vercel to
          activate QR sign-in.
        </p>
      </div>
    );
  return <QuickWebSignIn />;
}
