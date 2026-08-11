import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getInternalEligibility } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

export default async function InternalSignInPage() {
  const eligibility = await getInternalEligibility(await headers());
  if (!eligibility) notFound();
  if ((await auth()).userId) redirect("/");

  return <main className="signin-shell">
    <div className="signin-card">
      <span className="mark">NJC</span>
      <p className="eyebrow">Enrolled internal identity</p>
      <h1>Confirm your newsroom account.</h1>
      <p className="intro">The device and perimeter identity are eligible. Sign in with the matching Courier account to continue.</p>
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/" />
    </div>
  </main>;
}
