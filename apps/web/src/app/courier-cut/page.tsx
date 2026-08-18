import Link from "next/link";
import { Clapperboard, KeyRound } from "lucide-react";
import { notFound } from "next/navigation";
import { CourierCutLibrary } from "@/components/njc-plus/courier-cut-library";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { getAccountIdentity } from "@/lib/auth";
import {
  courierCutOrigin,
  getCourierCutDistributionMode,
  njcPlusOrigin,
} from "@/lib/courier-cut";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { listAccountPreviews } from "@/lib/njc-plus-preview";
import { getSiteOrigin } from "@/lib/origin";

export default async function CourierCutInvitePortal() {
  if (!(await isNjcPlusFeatureEnabled("njc_plus_preview_club"))) notFound();
  const [account, distributionMode] = await Promise.all([
    getAccountIdentity(),
    getCourierCutDistributionMode(),
  ]);
  const previews = account ? await listAccountPreviews(account.clerkId) : [];
  const servesContent = distributionMode === "njc_plus_and_subdomain";

  return (
    <>
      <NjcPlusHeader surface="courier-cut" />
      <main className="plus-section-page plus-cut-page">
        <header className="plus-shell">
          <p><Clapperboard /> Private screening room</p>
          <h1>The Courier Cut.</h1>
          <span>
            A controlled first look at selected NJC+ reporting, films and
            productions. Nothing appears here without a direct invitation.
          </span>
          <small>
            {servesContent
              ? "Authorized cuts can be viewed here and inside NJC+."
              : "This host currently manages invitations; authorized cuts continue in NJC+."}
          </small>
        </header>
        {!account ? (
          <section className="plus-shell plus-cut-empty">
            <KeyRound />
            <p>Invitation required</p>
            <h2>Sign in with the account that received the invitation.</h2>
            <span>Signing in never creates access. The server verifies a separate invitation for every cut.</span>
            <Link href={`${getSiteOrigin()}/sign-in?redirect_url=${encodeURIComponent(courierCutOrigin)}`}>
              Sign in to check access
            </Link>
          </section>
        ) : (
          <CourierCutLibrary
            items={previews.map(({ content, invitation, preview }) => ({
              id: invitation.id,
              href: servesContent
                ? `/${content.slug}`
                : `${njcPlusOrigin}/${content.slug}`,
              title: content.title,
              summary: content.summary,
              eyebrow: content.eyebrow,
              kind: content.kind,
              imageUrl: content.imageUrl,
              imageAlt: content.imageAlt,
              status: invitation.status,
              expiresAt: invitation.expiresAt ?? preview.expiresAt,
            }))}
            emptyTitle="This account has no active invitation."
            emptyCopy="Ask the NJC+ team to send an invitation to this exact verified account. Access cannot be requested or self-enabled here."
          />
        )}
      </main>
    </>
  );
}

