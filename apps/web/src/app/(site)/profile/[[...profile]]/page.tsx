import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getOptionalAccountId, isClerkConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  if (!isClerkConfigured()) {
    redirect("/sign-in");
  }

  const accountId = await getOptionalAccountId();
  if (!accountId) {
    redirect("/sign-in?redirect_url=/profile");
  }

  return (
    <section className="container-news py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Your account</p>
        <h1 className="font-editorial mt-2 text-4xl font-semibold tracking-tight text-brand-navy md:text-5xl">
          Profile
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Manage your New Jersey Courier identity, security, and connected accounts.
        </p>
        <div className="mt-8 flex justify-center">
          <UserProfile path="/profile" routing="path" />
        </div>
      </div>
    </section>
  );
}
