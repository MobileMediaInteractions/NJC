import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalAccountId, getStudioUser } from "@/lib/auth";
import { accountContinueUrl, accountLandingPath, accountReturnOrigins, safeAccountReturnTo } from "@/lib/account-sign-in";
import { getSiteOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Continue to your account", robots: { index: false, follow: false } };

export default async function AccountContinuePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const origin = getSiteOrigin();
  const allowedOrigins = accountReturnOrigins();
  const requested = (await searchParams).returnTo;
  if (!await getOptionalAccountId()) redirect(`/sign-in?redirect_url=${encodeURIComponent(accountContinueUrl(requested, origin, allowedOrigins))}`);
  const destination = safeAccountReturnTo(requested, origin, allowedOrigins);
  if (destination) redirect(destination);
  const staff = await getStudioUser();
  redirect(accountLandingPath(staff?.role, process.env.NEXT_PUBLIC_STUDIO_URL));
}
