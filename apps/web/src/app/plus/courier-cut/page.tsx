import { notFound, redirect } from "next/navigation";
import { CourierCutLibrary } from "@/components/njc-plus/courier-cut-library";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { getAccountIdentity } from "@/lib/auth";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { courierCutOrigin, njcPlusOrigin } from "@/lib/courier-cut";
import { listAccountPreviews } from "@/lib/njc-plus-preview";
import { getSiteOrigin } from "@/lib/origin";

export default async function CourierCutInNjcPlusPage() {
  if (!(await isNjcPlusFeatureEnabled("njc_plus_preview_club"))) notFound();
  const account = await getAccountIdentity();
  if (!account) {
    const destination = encodeURIComponent(`${njcPlusOrigin}/courier-cut`);
    redirect(`${getSiteOrigin()}/sign-in?redirect_url=${destination}`);
  }
  const previews = await listAccountPreviews(account.clerkId);

  return (
    <>
      <NjcPlusHeader />
      <main className="plus-section-page plus-cut-page">
        <header className="plus-shell">
          <p>Invitation-only early access</p>
          <h1>The Courier Cut.</h1>
          <span>
            Unreleased NJC+ work shared with a small invited audience. Your
            access, viewing window and feedback stay tied to your account.
          </span>
          <small>
            The dedicated invite portal also lives at {courierCutOrigin.replace("https://", "")}.
          </small>
        </header>
        <CourierCutLibrary
          items={previews.map(({ content, invitation, preview }) => ({
            id: invitation.id,
            href: `/plus/${content.slug}`,
            title: content.title,
            summary: content.summary,
            eyebrow: content.eyebrow,
            kind: content.kind,
            imageUrl: content.imageUrl,
            imageAlt: content.imageAlt,
            status: invitation.status,
            expiresAt: invitation.expiresAt ?? preview.expiresAt,
          }))}
          emptyTitle="There are no active cuts on this account."
          emptyCopy="Courier Cut appears only after the NJC+ team sends an active, title-specific invitation."
        />
      </main>
    </>
  );
}

